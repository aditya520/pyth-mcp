import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { HistoryClient } from "../../src/clients/history.js";
import pino from "pino";

const HISTORY_URL = "https://history.pyth-lazer.dourolabs.app";

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
    hermes_id: "0xabc",
    quote_currency: "USD",
  },
  {
    pyth_lazer_id: 2,
    name: "Ethereum",
    symbol: "ETH/USD",
    description: "Ethereum / USD",
    asset_type: "crypto",
    exponent: -8,
    min_channel: "fixed_rate@200ms",
    state: "active",
    hermes_id: "0xdef",
    quote_currency: "USD",
  },
];

const mockOHLC = {
  s: "ok",
  t: [1708300800, 1708387200],
  o: [51000, 52000],
  h: [52000, 53000],
  l: [50000, 51000],
  c: [51500, 52500],
  v: [100, 200],
};

const mockPrice = [
  {
    price_feed_id: 1,
    channel: "fixed_rate@200ms",
    publish_time: 1708300800,
    price: 5100000000000,
    best_bid_price: 5099900000000,
    best_ask_price: 5100100000000,
    confidence: 1000000,
    exponent: -8,
    publisher_count: 5,
  },
];

const handlers = [
  http.get(`${HISTORY_URL}/v1/symbols`, () =>
    HttpResponse.json(mockFeeds),
  ),
  http.get(`${HISTORY_URL}/v1/fixed_rate@200ms/history`, () =>
    HttpResponse.json(mockOHLC),
  ),
  http.get(`${HISTORY_URL}/v1/fixed_rate@200ms/price`, () =>
    HttpResponse.json(mockPrice),
  ),
];

const server = setupServer(...handlers);
const logger = pino({ level: "silent" });

const config = {
  historyUrl: HISTORY_URL,
  routerUrl: "https://pyth-lazer.dourolabs.app",
  channel: "fixed_rate@200ms",
  logLevel: "info" as const,
  requestTimeoutMs: 10000,
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("HistoryClient", () => {
  const client = new HistoryClient(config, logger);

  describe("getSymbols", () => {
    it("returns feeds", async () => {
      const feeds = await client.getSymbols();
      expect(feeds).toHaveLength(2);
      expect(feeds[0].symbol).toBe("BTC/USD");
    });

    it("handles 400 error", async () => {
      server.use(
        http.get(`${HISTORY_URL}/v1/symbols`, () =>
          HttpResponse.json({ error: "bad" }, { status: 400 }),
        ),
      );
      await expect(client.getSymbols()).rejects.toThrow("400");
    });
  });

  describe("getCandlestickData", () => {
    it("returns OHLC data", async () => {
      const data = await client.getCandlestickData(
        "fixed_rate@200ms",
        "BTC/USD",
        "D",
        1708300800,
        1708387200,
      );
      expect(data.s).toBe("ok");
      expect(data.t).toHaveLength(2);
    });
  });

  describe("getHistoricalPrice", () => {
    it("returns price data", async () => {
      const prices = await client.getHistoricalPrice(
        "fixed_rate@200ms",
        [1],
        1708300800000000,
      );
      expect(prices).toHaveLength(1);
      expect(prices[0].price_feed_id).toBe(1);
    });
  });
});
