import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { HistoryClient } from "../../src/clients/history.js";
import { RouterClient } from "../../src/clients/router.js";
import { registerAllTools } from "../../src/tools/index.js";
import { registerAllResources } from "../../src/resources/index.js";
import { createTestClient } from "../helpers.js";
import pino from "pino";

const HISTORY_URL = "https://history.pyth-lazer.dourolabs.app";
const ROUTER_URL = "https://pyth-lazer.dourolabs.app";

const mockFeeds = [
  {
    pyth_lazer_id: 1,
    name: "Bitcoin",
    symbol: "BTC/USD",
    description: "Bitcoin / US Dollar",
    asset_type: "crypto",
    exponent: -8,
    min_channel: "fixed_rate@200ms",
    state: "active",
    hermes_id: "0xabc",
    quote_currency: "USD",
  },
  {
    pyth_lazer_id: 2,
    name: "Ethereum",
    symbol: "ETH/USD",
    description: "Ethereum / US Dollar",
    asset_type: "crypto",
    exponent: -8,
    min_channel: "fixed_rate@200ms",
    state: "active",
    hermes_id: "0xdef",
    quote_currency: "USD",
  },
  {
    pyth_lazer_id: 10,
    name: "Gold",
    symbol: "XAU/USD",
    description: "Gold / US Dollar",
    asset_type: "metal",
    exponent: -5,
    min_channel: "fixed_rate@200ms",
    state: "active",
    hermes_id: null,
    quote_currency: "USD",
  },
];

const msw = setupServer(
  http.get(`${HISTORY_URL}/v1/symbols`, () => HttpResponse.json(mockFeeds)),
  http.get(`${HISTORY_URL}/v1/fixed_rate@200ms/history`, () =>
    HttpResponse.json({
      s: "ok",
      t: [1708300800],
      o: [51000],
      h: [52000],
      l: [50000],
      c: [51500],
      v: [100],
    }),
  ),
  http.get(`${HISTORY_URL}/v1/fixed_rate@200ms/price`, () =>
    HttpResponse.json([
      {
        price_feed_id: 1,
        channel: "fixed_rate@200ms",
        publish_time: 1708300800,
        price: 5150000000000,
        best_bid_price: 5149000000000,
        best_ask_price: 5151000000000,
        confidence: 500000,
        exponent: -8,
        publisher_count: 10,
      },
    ]),
  ),
  http.post(`${ROUTER_URL}/v1/latest_price`, () =>
    HttpResponse.json({
      parsed: {
        timestampUs: "1708300800000000",
        priceFeeds: [
          {
            priceFeedId: 1,
            price: "5200000000000",
            exponent: -8,
          },
        ],
      },
      leUnsigned: { encoding: "base64", data: "deadbeef" },
    }),
  ),
);

const logger = pino({ level: "silent" });

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

describe("Integration: MCP server round-trip", () => {
  let client: Client;

  beforeAll(async () => {
    const config = {
      channel: "fixed_rate@200ms",
      routerUrl: ROUTER_URL,
      historyUrl: HISTORY_URL,
      logLevel: "info" as const,
      requestTimeoutMs: 10000,
    };

    const mcpServer = new McpServer({ name: "test-server", version: "0.0.1" });
    const historyClient = new HistoryClient(config, logger);
    const routerClient = new RouterClient(config, logger);

    registerAllTools(mcpServer, config, historyClient, routerClient, logger);
    registerAllResources(mcpServer, historyClient);

    client = await createTestClient(mcpServer);
  });

  it("lists available tools", async () => {
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name);
    expect(names).toContain("get_symbols");
    expect(names).toContain("get_candlestick_data");
    expect(names).toContain("get_historical_price");
    expect(names).toContain("get_latest_price");
    expect(names).toHaveLength(4);
  });

  it("all tools have readOnlyHint annotation", async () => {
    const result = await client.listTools();
    for (const tool of result.tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  it("get_symbols returns feeds", async () => {
    const result = await client.callTool({
      name: "get_symbols",
      arguments: { query: "BTC" },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.feeds[0].symbol).toBe("BTC/USD");
  });

  it("get_candlestick_data returns OHLC", async () => {
    const result = await client.callTool({
      name: "get_candlestick_data",
      arguments: {
        symbol: "BTC/USD",
        resolution: "D",
        from: 1708300800,
        to: 1708387200,
      },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.s).toBe("ok");
    expect(data.t).toHaveLength(1);
  });

  it("get_historical_price resolves symbols to IDs", async () => {
    const result = await client.callTool({
      name: "get_historical_price",
      arguments: {
        symbols: ["BTC/USD"],
        timestamp: 1708300800,
      },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data[0].display_price).toBeDefined();
  });

  it("get_latest_price returns enriched data", async () => {
    const result = await client.callTool({
      name: "get_latest_price",
      arguments: { symbols: ["BTC/USD"], access_token: "test-token" },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data[0].display_price).toBeDefined();
    expect(data[0].evm).toBeUndefined();
  });

  it("lists resources", async () => {
    const result = await client.listResources();
    const uris = result.resources.map((r) => r.uri);
    expect(uris).toContain("pyth://feeds");
  });

  it("reads pyth://feeds resource", async () => {
    const result = await client.readResource({ uri: "pyth://feeds" });
    const feeds = JSON.parse(result.contents[0].text as string);
    expect(feeds).toHaveLength(3);
  });

  it("reads pyth://feeds/crypto resource", async () => {
    const result = await client.readResource({ uri: "pyth://feeds/crypto" });
    const feeds = JSON.parse(result.contents[0].text as string);
    expect(feeds.every((f: { asset_type: string }) => f.asset_type === "crypto")).toBe(true);
    expect(feeds).toHaveLength(2);
  });

  it("reads pyth://feeds/metal resource", async () => {
    const result = await client.readResource({ uri: "pyth://feeds/metal" });
    const feeds = JSON.parse(result.contents[0].text as string);
    expect(feeds).toHaveLength(1);
    expect(feeds[0].symbol).toBe("XAU/USD");
  });
});

describe("Integration: auth gating", () => {
  it("get_latest_price returns error without access_token, other tools work", async () => {
    const config = {
      channel: "fixed_rate@200ms",
      routerUrl: ROUTER_URL,
      historyUrl: HISTORY_URL,
      logLevel: "info" as const,
      requestTimeoutMs: 10000,
    };

    const mcpServer = new McpServer({ name: "test-no-token", version: "0.0.1" });
    const historyClient = new HistoryClient(config, logger);
    const routerClient = new RouterClient(config, logger);

    registerAllTools(mcpServer, config, historyClient, routerClient, logger);

    const client = await createTestClient(mcpServer);

    // get_symbols should work without token
    const symbolsResult = await client.callTool({
      name: "get_symbols",
      arguments: {},
    });
    expect(symbolsResult.isError).toBeFalsy();

    // get_latest_price should return auth error
    const priceResult = await client.callTool({
      name: "get_latest_price",
      arguments: { symbols: ["BTC/USD"] },
    });
    expect(priceResult.isError).toBe(true);
  });
});
