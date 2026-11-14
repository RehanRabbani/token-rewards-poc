import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, http, type Address, type Hex } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { createApp } from "../src/app.ts";
import { ViemChain, type Chain, type ChainOp } from "../src/chain.ts";
import { devIssuerKey } from "../src/config.ts";
import { openDb } from "../src/db.ts";
import { Ledger } from "../src/ledger.ts";
import { Settler } from "../src/settler.ts";

const CONTRACTS_DIR = fileURLToPath(new URL("../../contracts/", import.meta.url));
const ARTIFACT = fileURLToPath(
  new URL("../../contracts/artifacts/contracts/RewardToken.sol/RewardToken.json", import.meta.url),
);
const MNEMONIC = "test test test test test test test test test test test junk";

export const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function chainIsUp(): Promise<boolean> {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Use the local chain if one is already running; otherwise start one for the tests.
 * Returns a function that stops it (a no-op if we did not start it).
 */
export async function ensureChain(): Promise<() => void> {
  if (await chainIsUp()) return () => {};
  if (!existsSync(ARTIFACT)) throw new Error("The contract is not built. Run: npm run build -w contracts");

  const port = new URL(RPC_URL).port || "8545";
  const child = spawn("npx", ["hardhat", "node", "--port", port], {
    cwd: CONTRACTS_DIR,
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  const stop = () => {
    try {
      process.kill(-(child.pid as number), "SIGTERM");
    } catch {
      // already gone
    }
  };

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await chainIsUp()) return stop;
    await sleep(500);
  }
  stop();
  throw new Error("The local chain did not start within 90 seconds. Run `npm run chain` in another terminal and retry.");
}

const localChain = defineChain({
  id: 31337,
  name: "local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

/** Deploy a fresh RewardToken, so every test starts from an empty contract. */
async function deployToken(): Promise<Address> {
  const artifact = JSON.parse(readFileSync(ARTIFACT, "utf8")) as { abi: never; bytecode: `0x${string}` };
  const admin = mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
  const issuer = mnemonicToAccount(MNEMONIC, { addressIndex: 1 });
  const publicClient = createPublicClient({ chain: localChain, transport: http(RPC_URL), pollingInterval: 100 });
  const wallet = createWalletClient({ chain: localChain, account: admin, transport: http(RPC_URL) });
  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [admin.address, issuer.address],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress as Address;
}

export interface Stack {
  baseUrl: string;
  db: ReturnType<typeof openDb>;
  chain: ViemChain;
  ledger: Ledger;
  settler: Settler;
  tokenAddress: Address;
}

/** The whole system under test: fresh contract, fresh in-memory ledger, real HTTP API, real local chain. */
export async function withStack<T>(fn: (stack: Stack) => Promise<T>): Promise<T> {
  const tokenAddress = await deployToken();
  const db = openDb();
  const chain = new ViemChain({ rpcUrl: RPC_URL, tokenAddress, issuerKey: devIssuerKey(), pollingIntervalMs: 100 });
  const ledger = new Ledger(db, 200);
  const settler = new Settler(db, chain, 5);
  const app = createApp({ ledger, settler, chain, enableAdmin: true });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    return await fn({ baseUrl, db, chain, ledger, settler, tokenAddress });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function call(baseUrl: string, method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
  const res = await fetch(baseUrl + path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++counter}`;

/** The HTTP calls most tests need, bound to one running stack. */
export function api(s: Stack) {
  return {
    earn: (userId: string, over: Record<string, unknown> = {}) =>
      call(s.baseUrl, "POST", "/earn", { eventId: uid("evt"), userId, orderId: uid("order"), purchaseCents: 5000, ...over }),
    spend: (userId: string, points: number, over: Record<string, unknown> = {}) =>
      call(s.baseUrl, "POST", "/spend", { eventId: uid("spend"), userId, orderId: uid("order"), points, ...over }),
    refund: (userId: string, orderId: string, over: Record<string, unknown> = {}) =>
      call(s.baseUrl, "POST", "/refund", { eventId: uid("refund"), userId, orderId, ...over }),
    balance: async (userId: string) => (await call(s.baseUrl, "GET", `/balance/${userId}`)).body,
    settle: async () => (await call(s.baseUrl, "POST", "/admin/settle")).body,
    reconcile: async () => (await call(s.baseUrl, "GET", "/admin/reconcile")).body,
  };
}

/**
 * A chain that fails at chosen moments, to test crashes. It wraps the real chain, so
 * everything that does reach the chain really happens there.
 */
export class FlakyChain implements Chain {
  /** The next N sends fail before reaching the chain (a dropped connection). */
  beforeSend = 0;
  /** The next N sends reach the chain and confirm, then fail (the process died before saving the hash). */
  afterSend = 0;
  /** The next N waits for confirmation fail (the process died while waiting). */
  duringWait = 0;
  /** Every call fails (the chain cannot be reached). */
  down = false;
  /** isProcessed always says "no", even when the chain knows the reference (the first safety check is wrong). */
  denyProcessed = false;
  /** If set, beforeSend and afterSend only apply to sends for this user. */
  only?: Address;
  /** How many sends really reached the chain. */
  sends = 0;

  constructor(private readonly inner: Chain) {}

  private applies(user: Address): boolean {
    return this.only === undefined || this.only === user;
  }

  async isProcessed(ref: Hex): Promise<boolean> {
    if (this.down) throw new Error("chain unreachable");
    if (this.denyProcessed) return false;
    return this.inner.isProcessed(ref);
  }

  async send(op: ChainOp, user: Address, amount: bigint, ref: Hex): Promise<Hex> {
    if (this.down) throw new Error("chain unreachable");
    if (this.applies(user) && this.beforeSend > 0) {
      this.beforeSend--;
      throw new Error("connection dropped before sending");
    }
    const hash = await this.inner.send(op, user, amount, ref);
    this.sends++;
    if (this.applies(user) && this.afterSend > 0) {
      this.afterSend--;
      await this.inner.waitForReceipt(hash);
      throw new Error("process died after sending");
    }
    return hash;
  }

  async waitForReceipt(hash: Hex): Promise<void> {
    if (this.down) throw new Error("chain unreachable");
    if (this.duringWait > 0) {
      this.duringWait--;
      throw new Error("process died while waiting");
    }
    return this.inner.waitForReceipt(hash);
  }

  balanceOf(user: Address): Promise<bigint> {
    if (this.down) throw new Error("chain unreachable");
    return this.inner.balanceOf(user);
  }
}
