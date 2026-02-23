import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type pino from "pino";
import type { Config } from "./config.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
import { HistoryClient } from "./clients/history.js";
import { RouterClient } from "./clients/router.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { createLogger } from "./utils/logger.js";

export function createServer(config: Config): {
  server: McpServer;
  logger: pino.Logger;
} {
  const logger = createLogger(config);
  const historyClient = new HistoryClient(config, logger);
  const routerClient = new RouterClient(config, logger);

  const server = new McpServer({
    name: "@pyth-network/mcp-server",
    version,
  });

  registerAllTools(server, config, historyClient, routerClient, logger);
  registerAllResources(server, historyClient);

  const cleanup = async () => {
    await server.close();
    process.exit(0);
  };
  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);

  return { server, logger };
}
