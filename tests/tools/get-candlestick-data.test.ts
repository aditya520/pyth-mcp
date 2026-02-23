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

const msw = setupServer(
  http.get(`${HISTORY_URL}/v1/symbols`, () => HttpResponse.json(mockFeeds)),
  http.get(`${HISTORY_URL}/v1/fixed_rate@200ms/history`, () =>
    HttpResponse.json({
      s: "ok",
      t: [1708300800, 1708387200],
      o: [51000, 51500],
      h: [52000, 52500],
      l: [50000, 50500],
      c: [51500, 52000],
      v: [100, 150],
    }),
  ),
);

const logger = pino({ level: "silent" });

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

describe("get_candlestick_data tool", () => {
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

  it("returns OHLC data for valid request", async () => {
    const result = await client.callTool({
      name: "get_candlestick_data",
      arguments: {
        symbol: "BTC/USD",
        resolution: "D",
        from: 1708300800,
        to: 1708473600,
      },
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.s).toBe("ok");
    expect(data.t).toHaveLength(2);
  });

  it("returns tool error for no_data response", async () => {
    msw.use(
      http.get(`${HISTORY_URL}/v1/fixed_rate@200ms/history`, () =>
        HttpResponse.json({ s: "no_data", t: [], o: [], h: [], l: [], c: [], v: [] }),
      ),
    );

    const result = await client.callTool({
      name: "get_candlestick_data",
      arguments: {
        symbol: "BTC/USD",
        resolution: "D",
        from: 1708300800,
        to: 1708473600,
      },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("No candlestick data");
  });

  it("truncates results beyond 500 candles", async () => {
    const bigData = {
      s: "ok",
      t: Array.from({ length: 600 }, (_, i) => 1708300800 + i * 86400),
      o: Array.from({ length: 600 }, () => 51000),
      h: Array.from({ length: 600 }, () => 52000),
      l: Array.from({ length: 600 }, () => 50000),
      c: Array.from({ length: 600 }, () => 51500),
      v: Array.from({ length: 600 }, () => 100),
    };

    msw.use(
      http.get(`${HISTORY_URL}/v1/fixed_rate@200ms/history`, () =>
        HttpResponse.json(bigData),
      ),
    );

    const result = await client.callTool({
      name: "get_candlestick_data",
      arguments: {
        symbol: "BTC/USD",
        resolution: "1",
        from: 1708300800,
        to: 1760000000,
      },
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.truncated).toBe(true);
    expect(data.returned).toBe(500);
    expect(data.total_available).toBe(600);
    expect(data.t).toHaveLength(500);
  });
});
