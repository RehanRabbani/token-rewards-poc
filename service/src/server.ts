import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createApp } from "./app.ts";
import { ViemChain } from "./chain.ts";
import { loadConfig } from "./config.ts";
import { openDb } from "./db.ts";
import { Ledger } from "./ledger.ts";
import { Settler } from "./settler.ts";

const config = loadConfig();
mkdirSync(dirname(config.dbPath), { recursive: true });

const db = openDb(config.dbPath);
const chain = new ViemChain({
  rpcUrl: config.rpcUrl,
  tokenAddress: config.tokenAddress,
  issuerKey: config.issuerKey,
  chainId: config.chainId,
});
const ledger = new Ledger(db, config.rewardRateBps);
const settler = new Settler(db, chain, config.maxAttempts);
const app = createApp({ ledger, settler, chain, enableAdmin: config.enableAdmin });

// Settle in the background. One pass at a time; a failed pass is retried on the next tick.
let running = false;
setInterval(async () => {
  if (running) return;
  running = true;
  try {
    await settler.runOnce();
  } catch (err) {
    console.error("settle pass failed", err);
  } finally {
    running = false;
  }
}, config.settleIntervalMs);

app.listen(config.port, () => {
  console.log(`Ledger service on http://localhost:${config.port}`);
  console.log(`Token ${config.tokenAddress} via ${config.rpcUrl}; reward rate ${config.rewardRateBps / 100}%`);
});
