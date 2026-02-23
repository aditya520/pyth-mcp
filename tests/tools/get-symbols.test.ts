import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { loadConfig } from "../../src/config.js";
import { HistoryClient } from "../../src/clients/history.js";
import { RouterClient } from "../../src/clients/router.js";
import { registerAllTools } from "../../src/tools/index.js";
import { createTestClient } from "../helpers.js";
import pino from "pino";

const HISTORY_URL = "https://history.pyth-lazer.dourolabs.app";

const mockFeeds = Array.from({ length: 100 }, (_, i) => ({
  pyth_lazer_id: i + 1,
  name: `Feed${i}`,
  symbol: `FEED${i}/USD`,
  description: `Feed ${i} / USD`,
  asset_type: i < 50 ? "crypto" : "equity",
  exponent: -8,
  min_channel: "fixed_rate@200ms",
  state: "active",
  hermes_id: null,
  quote_currency: "USD",
}));

mockFeeds.push(
  {
    pyth_lazer_id: 200,
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
    pyth_lazer_id: 201,
    name: "Apple Inc.",
    symbol: "Equity.US.AAPL/USD",
    description: "Apple Inc. / US Dollar",
    asset_type: "equity",
    exponent: -8,
    min_channel: "fixed_rate@200ms",
    state: "active",
    hermes_id: null,
    quote_currency: "USD",
  },
);

const msw = setupServer(
  http.get(`${HISTORY_URL}/v1/symbols`, ({ request }) => {
    const url = new URL(request.url);
    // query filtering is now client-side; assert it's never sent upstream
    if (url.searchParams.has("query")) {
      return new HttpResponse("query param must not be sent upstream", { status: 400 });
    }
    const assetType = url.searchParams.get("asset_type");
    let filtered = mockFeeds;
    if (assetType) {
      filtered = filtered.filter((f) => f.asset_type === assetType);
    }
    return HttpResponse.json(filtered);
  }),
);

const logger = pino({ level: "silent" });

beforeAll(() => msw.listen({ onUnhandledRequest: "error" }));
afterEach(() => msw.resetHandlers());
afterAll(() => msw.close());

describe("get_symbols tool", () => {
  let client: Client;

  beforeAll(async () => {
    const config = loadConfig();
    const historyClient = new HistoryClient(config, logger);
    const routerClient = new RouterClient(config, logger);

    const mcpServer = new McpServer({ name: "test", version: "0.0.1" });
    registerAllTools(mcpServer, config, historyClient, routerClient, logger);
    client = await createTestClient(mcpServer);
  });

  it("returns paginated results with defaults", async () => {
    const result = await client.callTool({ name: "get_symbols", arguments: {} });
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const data = JSON.parse(text);

    expect(data.count).toBe(50);
    expect(data.total_available).toBe(102);
    expect(data.has_more).toBe(true);
    expect(data.offset).toBe(0);
    expect(data.next_offset).toBe(50);
  });

  it("filters by query", async () => {
    const result = await client.callTool({
      name: "get_symbols",
      arguments: { query: "Bitcoin" },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.feeds.some((f: { symbol: string }) => f.symbol === "BTC/USD")).toBe(true);
  });

  it("filters by asset_type", async () => {
    const result = await client.callTool({
      name: "get_symbols",
      arguments: { asset_type: "equity" },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.feeds.every((f: { asset_type: string }) => f.asset_type === "equity")).toBe(true);
  });

  it("paginates with offset and limit", async () => {
    const result = await client.callTool({
      name: "get_symbols",
      arguments: { offset: 90, limit: 20 },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.count).toBe(12);
    expect(data.has_more).toBe(false);
    expect(data.next_offset).toBeNull();
  });

  it("matches query against name (client-side)", async () => {
    const result = await client.callTool({
      name: "get_symbols",
      arguments: { query: "apple" },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.feeds).toHaveLength(1);
    expect(data.feeds[0].symbol).toBe("Equity.US.AAPL/USD");
  });

  it("matches query against symbol (client-side)", async () => {
    const result = await client.callTool({
      name: "get_symbols",
      arguments: { query: "AAPL" },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.feeds).toHaveLength(1);
    expect(data.feeds[0].name).toBe("Apple Inc.");
  });

  it("combines server-side asset_type with client-side query", async () => {
    const result = await client.callTool({
      name: "get_symbols",
      arguments: { query: "apple", asset_type: "equity" },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.feeds).toHaveLength(1);
    expect(data.feeds[0].symbol).toBe("Equity.US.AAPL/USD");
  });

  it("treats whitespace-only query as no filter", async () => {
    const result = await client.callTool({
      name: "get_symbols",
      arguments: { query: "  " },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    expect(data.total_available).toBe(102);
  });

  it("paginates after client-side filtering", async () => {
    const result = await client.callTool({
      name: "get_symbols",
      arguments: { query: "Feed1", offset: 0, limit: 5 },
    });
    const data = JSON.parse(
      (result.content as Array<{ type: string; text: string }>)[0].text,
    );
    // Feed1, Feed10-Feed19 = 11 feeds match "Feed1"
    expect(data.total_available).toBe(11);
    expect(data.count).toBe(5);
    expect(data.has_more).toBe(true);
    expect(data.next_offset).toBe(5);
  });
});
