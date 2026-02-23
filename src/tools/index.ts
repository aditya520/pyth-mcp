import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type pino from "pino";
import type { Config } from "../config.js";
import type { HistoryClient } from "../clients/history.js";
import type { RouterClient } from "../clients/router.js";
import { registerGetSymbols } from "./get-symbols.js";
import { registerGetCandlestickData } from "./get-candlestick-data.js";
import { registerGetHistoricalPrice } from "./get-historical-price.js";
import { registerGetLatestPrice } from "./get-latest-price.js";

export function registerAllTools(
  server: McpServer,
  config: Config,
  historyClient: HistoryClient,
  routerClient: RouterClient,
  logger: pino.Logger,
): void {
  registerGetSymbols(server, config, historyClient, logger);
  registerGetCandlestickData(server, config, historyClient, logger);
  registerGetHistoricalPrice(server, config, historyClient, logger);
  registerGetLatestPrice(server, config, routerClient, logger);
}
