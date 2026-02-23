import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HistoryClient } from "../../src/clients/history.js";
import { RouterClient } from "../../src/clients/router.js";
import { registerAllTools } from "../../src/tools/index.js";
import { createTestClient } from "../helpers.js";
import pino from "pino";

const HISTORY_URL = "https://history.pyth-lazer.dourolabs.app";
const ROUTER_URL = "https://pyth-lazer.dourolabs.app";

const mockFeeds = [
  {
    pyth_lazer_id: 1,
    name: "Bitcoin",
    symbol: "BTC/USD",
    description: "Bitcoin / USD",
    asset_type: "crypto",
    exponent: -8,
    min_channel: "fixed_rate@200ms",
    state: "active",
    hermes_id: null,
    quote_currency: "USD",
  },
];

const mockLatestPrice = {
  parsed: [
    {
      price_feed_id: 1,
      timestamp_us: 1708300800000000,
      channel: "fixed_rate@200ms",
      price: 9742350000000,
      best_bid_price: 9742340000000,
      best_ask_price: 9742360000000,
      confidence: 100000,
      exponent: -8,
      publisher_count: 5,
      evm: "0xdeadbeef",
      solana: "base64data",
    },
  ],
};

const msw = setupServer(
  http.get(`${HISTORY_URL}/v1/symbols`, () => HttpResponse.json(mockFeeds)),
  http.post(`${ROUTER_URL}/v1/latest_price`, () =>
    HttpResponse.json(mockLatestPrice),
  ),
);

const logger = pino({ level: "silent" });

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

describe("get_latest_price tool", () => {
  it("returns auth error when no access_token", async () => {
    const config = {
      channel: "fixed_rate@200ms",
      routerUrl: ROUTER_URL,
      historyUrl: HISTORY_URL,
      logLevel: "info" as const,
      requestTimeoutMs: 10000,
    };

    const mcpServer = new McpServer({ name: "test", version: "0.0.1" });
    const historyClient = new HistoryClient(config, logger);
    const routerClient = new RouterClient(config, logger);
    registerAllTools(mcpServer, config, historyClient, routerClient, logger);

    const client = await createTestClient(mcpServer);
    const result = await client.callTool({
      name: "get_latest_price",
      arguments: { symbols: ["BTC/USD"] },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("access token");
    expect(text).toContain("access_token");
    expect(text).toContain("pyth.network/pricing");
  });

  it("returns price with display_price when access_token provided", async () => {
    const config = {
      channel: "fixed_rate@200ms",
      routerUrl: ROUTER_URL,
      historyUrl: HISTORY_URL,
      logLevel: "info" as const,
      requestTimeoutMs: 10000,
    };

    const mcpServer = new McpServer({ name: "test", version: "0.0.1" });
    const historyClient = new HistoryClient(config, logger);
    const routerClient = new RouterClient(config, logger);
    registerAllTools(mcpServer, config, historyClient, routerClient, logger);

    const client = await createTestClient(mcpServer);
    const result = await client.callTool({
      name: "get_latest_price",
      arguments: { symbols: ["BTC/USD"], access_token: "test-token" },
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data).toHaveLength(1);
    expect(data[0].price_feed_id).toBe(1);
    expect(data[0].display_price).toBeCloseTo(97423.5, 2);
    expect(data[0].evm).toBeUndefined();
    expect(data[0].solana).toBeUndefined();
  });
});
