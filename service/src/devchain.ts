// Local development helpers: start a local chain and deploy a fresh token to it.
// Used by the tests and by `npm run demo`. Never used against a real network.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, http, type Address } from "viem";
import { mnemonicToAccount } from "viem/accounts";

const CONTRACTS_DIR = fileURLToPath(new URL("../../contracts/", import.meta.url));
const ARTIFACT = fileURLToPath(
  new URL("../../contracts/artifacts/contracts/RewardToken.sol/RewardToken.json", import.meta.url),
);
/** Hardhat's public test mnemonic. Its keys are known to everyone: local use only. */
const MNEMONIC = "test test test test test test test test test test test junk";

export const LOCAL_RPC_URL = "http://127.0.0.1:8545";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function chainIsUp(rpcUrl: string): Promise<boolean> {
  try {
    const res = await fetch(rpcUrl, {
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
 * Use the local chain if one is already running; otherwise start one.
 * Returns a function that stops it (a no-op if we did not start it).
 */
export async function ensureChain(rpcUrl = LOCAL_RPC_URL): Promise<() => void> {
  if (await chainIsUp(rpcUrl)) return () => {};
  if (!existsSync(ARTIFACT)) throw new Error("The contract is not built. Run: npm run build -w contracts");

  const port = new URL(rpcUrl).port || "8545";
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
    if (await chainIsUp(rpcUrl)) return stop;
    await sleep(500);
  }
  stop();
  throw new Error("The local chain did not start within 90 seconds. Run `npm run chain` in another terminal and retry.");
}

/** Deploy a fresh RewardToken: admin is Hardhat account #0, issuer is account #1. */
export async function deployToken(rpcUrl = LOCAL_RPC_URL): Promise<Address> {
  const localChain = defineChain({
    id: 31337,
    name: "local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  const artifact = JSON.parse(readFileSync(ARTIFACT, "utf8")) as { abi: never; bytecode: `0x${string}` };
  const admin = mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
  const issuer = mnemonicToAccount(MNEMONIC, { addressIndex: 1 });
  const publicClient = createPublicClient({ chain: localChain, transport: http(rpcUrl), pollingInterval: 100 });
  const wallet = createWalletClient({ chain: localChain, account: admin, transport: http(rpcUrl) });
  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [admin.address, issuer.address],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress as Address;
}
