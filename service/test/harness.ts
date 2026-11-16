import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import type { Address, Hex } from "viem";
import { createApp } from "../src/app.ts";
import { ViemChain, type Chain, type ChainOp } from "../src/chain.ts";
import { devIssuerKey } from "../src/config.ts";
import { openDb } from "../src/db.ts";
import type { DemoOptions } from "../src/demo-routes.ts";
import { deployToken, ensureChain as startChain, LOCAL_RPC_URL } from "../src/devchain.ts";
import { Ledger } from "../src/ledger.ts";
import { Settler } from "../src/settler.ts";

export const RPC_URL = process.env.RPC_URL ?? LOCAL_RPC_URL;

/** Use the local chain if one is already running; otherwise start one for the tests. */
export const ensureChain = () => startChain(RPC_URL);

export interface Stack {
  baseUrl: string;
  db: ReturnType<typeof openDb>;
  chain: ViemChain;
  ledger: Ledger;
  settler: Settler;
  tokenAddress: Address;
  /** The flag the demo page flips to pause the background settler. */
  settlerControl: { paused: boolean };
}

const DEMO_PAGE_DIR = fileURLToPath(new URL("../../demo/", import.meta.url));

/** The whole system under test: fresh contract, fresh in-memory ledger, real HTTP API, real local chain. */
export async function withStack<T>(fn: (stack: Stack) => Promise<T>): Promise<T> {
  const tokenAddress = await deployToken(RPC_URL);
  const db = openDb();
  const chain = new ViemChain({ rpcUrl: RPC_URL, tokenAddress, issuerKey: devIssuerKey(), pollingIntervalMs: 100 });
  const ledger = new Ledger(db, 200);
  const settler = new Settler(db, chain, 5);
  const settlerControl = { paused: false };
  const demo: DemoOptions = { pageDir: DEMO_PAGE_DIR, settlerControl, tokenAddress, rewardRateBps: 200 };
  const app = createApp({ ledger, settler, chain, enableAdmin: true, demo });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    return await fn({ baseUrl, db, chain, ledger, settler, tokenAddress, settlerControl });
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
