import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
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

const mockHistoricalPrice = [
  {
    price_feed_id: 1,
    channel: 3,
    publish_time: 1708300800,
    price: 5150000000000,
    best_bid_price: 5149000000000,
    best_ask_price: 5151000000000,
    confidence: 500000,
    exponent: -8,
    publisher_count: 10,
  },
  {
    price_feed_id: 1,
    channel: 3,
    publish_time: 1708300600,
    price: 5140000000000,
    best_bid_price: null,
    best_ask_price: null,
    confidence: null,
    exponent: null,
    publisher_count: null,
  },
];

const msw = setupServer(
  http.get(`${HISTORY_URL}/v1/symbols`, () => HttpResponse.json(mockFeeds)),
  http.get(`${HISTORY_URL}/v1/fixed_rate@200ms/price`, ({ request }) => {
    const url = new URL(request.url);
    const ids = url.searchParams.getAll("ids");
    if (ids.length === 0) return new HttpResponse(null, { status: 400 });
    return HttpResponse.json(mockHistoricalPrice);
  }),
);

const logger = pino({ level: "silent" });

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

describe("get_historical_price tool", () => {
  let client: Client;

  beforeAll(async () => {
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
    client = await createTestClient(mcpServer);
  });

  it("returns enriched prices via symbol lookup", async () => {
    const result = await client.callTool({
      name: "get_historical_price",
      arguments: {
        symbols: ["BTC/USD"],
        timestamp: 1708300800,
      },
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data).toHaveLength(2);
    expect(data[0].price_feed_id).toBe(1);
    expect(data[0].display_price).toBeDefined();
    expect(data[0].display_bid).toBeDefined();
    expect(data[0].display_ask).toBeDefined();
    // Second entry has null confidence/exponent and null bid/ask
    expect(data[1].confidence).toBeNull();
    expect(data[1].exponent).toBeNull();
    expect(data[1].display_price).toBeDefined();
    expect(data[1].display_bid).toBeUndefined();
    expect(data[1].display_ask).toBeUndefined();
  });

  it("returns enriched prices via feed IDs", async () => {
    const result = await client.callTool({
      name: "get_historical_price",
      arguments: {
        price_feed_ids: [1],
        timestamp: 1708300800,
      },
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data).toHaveLength(2);
    expect(data[0].display_price).toBeDefined();
  });

  it("returns error for unknown symbol", async () => {
    const result = await client.callTool({
      name: "get_historical_price",
      arguments: {
        symbols: ["UNKNOWN/USD"],
        timestamp: 1708300800,
      },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Feed not found");
  });
});
