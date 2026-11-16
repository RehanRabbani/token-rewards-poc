// `npm run demo`: everything the demo page needs, in one command.
//   1. use the local chain if one is running, otherwise start one
//   2. deploy a fresh token
//   3. start the service with an empty ledger kept in memory
// A fresh token and an empty ledger every time, so the two always start out in agreement.
import { loadConfig } from "./config.ts";
import { deployToken, ensureChain, LOCAL_RPC_URL } from "./devchain.ts";
import { startServer } from "./start.ts";

console.log("Starting a local blockchain (the first start can take a minute)...");
const stopChain = await ensureChain(LOCAL_RPC_URL);

let server: ReturnType<typeof startServer> | undefined;
const shutdown = () => {
  server?.close();
  stopChain();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  const tokenAddress = await deployToken(LOCAL_RPC_URL);
  const config = loadConfig({
    ...process.env,
    RPC_URL: LOCAL_RPC_URL,
    TOKEN_ADDRESS: tokenAddress,
    DB_PATH: ":memory:",
  });
  server = startServer(config);
  server.on("error", (err) => {
    console.error(`Could not start the service: ${err.message}. If port ${config.port} is busy, try PORT=3001 npm run demo`);
    stopChain();
    process.exit(1);
  });
  console.log("Press Ctrl+C to stop.");
} catch (err) {
  stopChain();
  throw err;
}
