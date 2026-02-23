import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { RouterClient } from "../../src/clients/router.js";
import pino from "pino";

const ROUTER_URL = "https://pyth-lazer.dourolabs.app";

const mockLatestPrice = {
  parsed: {
    timestampUs: "1708300800000000",
    priceFeeds: [
      {
        priceFeedId: 1,
        price: "5100000000000",
        bestBidPrice: "5099900000000",
        bestAskPrice: "5100100000000",
        confidence: "1000000",
        exponent: -8,
        publisherCount: 5,
      },
    ],
  },
  leUnsigned: { encoding: "base64", data: "binary1" },
};

let lastRequestBody: Record<string, unknown> = {};

const handlers = [
  http.post(`${ROUTER_URL}/v1/latest_price`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    lastRequestBody = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(mockLatestPrice);
  }),
];

const server = setupServer(...handlers);
const logger = pino({ level: "silent" });

const config = {
  routerUrl: ROUTER_URL,
  historyUrl: "https://history.pyth-lazer.dourolabs.app",
  channel: "fixed_rate@200ms",
  logLevel: "info" as const,
  requestTimeoutMs: 10000,
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("RouterClient", () => {
  const client = new RouterClient(config, logger);

  it("returns normalized feeds with snake_case and numeric values", async () => {
    const feeds = await client.getLatestPrice("test-token", ["Crypto.BTC/USD"]);
    expect(feeds).toHaveLength(1);
    expect(feeds[0].price_feed_id).toBe(1);
    expect(feeds[0].timestamp_us).toBe(1708300800000000);
    expect(feeds[0].price).toBe(5100000000000);
    expect(feeds[0].best_bid_price).toBe(5099900000000);
    expect(feeds[0].best_ask_price).toBe(5100100000000);
    expect(feeds[0].confidence).toBe(1000000);
    expect(feeds[0].exponent).toBe(-8);
    expect(feeds[0].publisher_count).toBe(5);
  });

  it("sends Authorization header", async () => {
    const feeds = await client.getLatestPrice("my-secret-token", ["Crypto.BTC/USD"]);
    expect(feeds).toHaveLength(1);
  });

  it("sends properties, formats, and camelCase priceFeedIds", async () => {
    await client.getLatestPrice("test-token", undefined, [1, 2]);
    expect(lastRequestBody.properties).toEqual([
      "price",
      "bestBidPrice",
      "bestAskPrice",
      "exponent",
      "publisherCount",
      "confidence",
    ]);
    expect(lastRequestBody.formats).toEqual(["leUnsigned"]);
    expect(lastRequestBody.priceFeedIds).toEqual([1, 2]);
    expect(lastRequestBody).not.toHaveProperty("price_feed_ids");
  });

  it("throws on 403 (invalid token)", async () => {
    server.use(
      http.post(`${ROUTER_URL}/v1/latest_price`, () =>
        HttpResponse.json({ error: "Forbidden" }, { status: 403 }),
      ),
    );
    await expect(
      client.getLatestPrice("bad-token", ["BTC/USD"]),
    ).rejects.toThrow("403");
  });
});
