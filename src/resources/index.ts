import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HistoryClient } from "../clients/history.js";
import { ASSET_TYPES } from "../constants.js";

export function registerAllResources(
  server: McpServer,
  historyClient: HistoryClient,
): void {
  // Static resource: full feed catalog
  server.registerResource(
    "feeds",
    "pyth://feeds",
    {
      description:
        "Full catalog of all Pyth Pro price feeds across all asset classes.",
      mimeType: "application/json",
    },
    async (uri) => {
      const feeds = await historyClient.getSymbols();
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(feeds),
          },
        ],
      };
    },
  );

  // Template resource: feeds filtered by asset_type
  server.registerResource(
    "feeds-by-asset-type",
    new ResourceTemplate("pyth://feeds/{asset_type}", {
      list: async () => ({
        resources: ASSET_TYPES.map((t) => ({
          uri: `pyth://feeds/${t}`,
          name: `${t} feeds`,
          description: `Pyth Pro ${t} price feeds`,
        })),
      }),
    }),
    {
      description:
        "Pyth Pro price feeds filtered by asset type (crypto, fx, equity, metal, rates, commodity, funding-rate).",
      mimeType: "application/json",
    },
    async (uri, { asset_type }) => {
      const feeds = await historyClient.getSymbols();
      const filtered = feeds.filter((f) => f.asset_type === asset_type);
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(filtered),
          },
        ],
      };
    },
  );
}
