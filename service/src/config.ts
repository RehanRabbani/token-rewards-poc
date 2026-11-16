import { readFileSync } from "node:fs";
import { bytesToHex, isAddress, type Address, type Hex } from "viem";
import { mnemonicToAccount } from "viem/accounts";

export interface Config {
  port: number;
  rpcUrl: string;
  chainId: number;
  tokenAddress: Address;
  issuerKey: Hex;
  dbPath: string;
  rewardRateBps: number;
  maxAttempts: number;
  settleIntervalMs: number;
  enableAdmin: boolean;
  /** Serve the demo page and its demo-only routes. Only ever on against a local chain. */
  enableDemo: boolean;
}

/** Hardhat's public test mnemonic. Its keys are known to everyone: local use only. */
const HARDHAT_MNEMONIC = "test test test test test test test test test test test junk";

/** The issuer key of a local Hardhat chain (account #1). Never use it anywhere else. */
export function devIssuerKey(): Hex {
  const key = mnemonicToAccount(HARDHAT_MNEMONIC, { addressIndex: 1 }).getHdKey().privateKey;
  if (!key) throw new Error("could not derive the dev issuer key");
  return bytesToHex(key);
}

function readDeployedAddress(): Address {
  const file = new URL("../../contracts/deployments/localhost.json", import.meta.url);
  try {
    const { address } = JSON.parse(readFileSync(file, "utf8")) as { address: string };
    if (isAddress(address)) return address;
  } catch {
    // fall through to the helpful message
  }
  throw new Error(
    "No token address. Start a chain with `npm run chain`, deploy with `npm run deploy:local -w contracts`, or set TOKEN_ADDRESS.",
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const rpcUrl = env.RPC_URL ?? "http://127.0.0.1:8545";
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(rpcUrl);

  const issuerKey = (env.ISSUER_PRIVATE_KEY as Hex | undefined) ?? (isLocal ? devIssuerKey() : undefined);
  if (!issuerKey) throw new Error("ISSUER_PRIVATE_KEY is required when RPC_URL is not a local chain");
  if (isLocal && !env.ISSUER_PRIVATE_KEY) console.warn("Using Hardhat's public dev key. Local chain only.");

  const tokenAddress = (env.TOKEN_ADDRESS as Address | undefined) ?? readDeployedAddress();
  if (!isAddress(tokenAddress)) throw new Error("TOKEN_ADDRESS is not a valid address");

  return {
    port: Number(env.PORT ?? 3000),
    rpcUrl,
    chainId: Number(env.CHAIN_ID ?? 31337),
    tokenAddress,
    issuerKey,
    dbPath: env.DB_PATH ?? "./data/ledger.sqlite",
    rewardRateBps: Number(env.REWARD_RATE_BPS ?? 200), // 200 bps = 2% of purchase value
    maxAttempts: Number(env.MAX_ATTEMPTS ?? 5),
    settleIntervalMs: Number(env.SETTLE_INTERVAL_MS ?? 1000),
    enableAdmin: env.ENABLE_ADMIN === "1" || (isLocal && env.ENABLE_ADMIN !== "0"),
    enableDemo: isLocal && env.ENABLE_DEMO !== "0",
  };
}
