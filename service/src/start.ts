import { mkdirSync } from "node:fs";
import type { Server } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";
import { ViemChain } from "./chain.ts";
import type { Config } from "./config.ts";
import { openDb } from "./db.ts";
import { Ledger } from "./ledger.ts";
import { Settler } from "./settler.ts";

const DEMO_PAGE_DIR = fileURLToPath(new URL("../../demo/", import.meta.url));

/** Build the service from its settings, start the API and the background settler. */
export function startServer(config: Config): Server {
  if (config.dbPath !== ":memory:") mkdirSync(dirname(config.dbPath), { recursive: true });

  const db = openDb(config.dbPath);
  const chain = new ViemChain({
    rpcUrl: config.rpcUrl,
    tokenAddress: config.tokenAddress,
    issuerKey: config.issuerKey,
    chainId: config.chainId,
    pollingIntervalMs: config.enableDemo ? 200 : undefined, // a local chain confirms at once
  });
  const ledger = new Ledger(db, config.rewardRateBps);
  const settler = new Settler(db, chain, config.maxAttempts);
  const settlerControl = { paused: false }; // only the demo page ever pauses it
  const app = createApp({
    ledger,
    settler,
    chain,
    enableAdmin: config.enableAdmin,
    demo: config.enableDemo
      ? { pageDir: DEMO_PAGE_DIR, settlerControl, tokenAddress: config.tokenAddress, rewardRateBps: config.rewardRateBps }
      : undefined,
  });

  // Settle in the background. One pass at a time; a failed pass is retried on the next tick.
  let running = false;
  setInterval(async () => {
    if (running || settlerControl.paused) return;
    running = true;
    try {
      await settler.runOnce();
    } catch (err) {
      console.error("settle pass failed", err);
    } finally {
      running = false;
    }
  }, config.settleIntervalMs);

  return app.listen(config.port, () => {
    console.log(`Ledger service on http://localhost:${config.port}`);
    console.log(`Token ${config.tokenAddress} via ${config.rpcUrl}; reward rate ${config.rewardRateBps / 100}%`);
    if (config.enableDemo) console.log(`Demo page: open http://localhost:${config.port} in a browser`);
  });
}
