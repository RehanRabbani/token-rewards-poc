import { loadConfig } from "./config.ts";
import { startServer } from "./start.ts";

startServer(loadConfig());
