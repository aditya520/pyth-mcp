import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { RouterClient } from "../../src/clients/router.js";
import pino from "pino";

const ROUTER_URL = "https://pyth-lazer.dourolabs.app";

const mockLatestPrice = {
  parsed: [
    {
      price_feed_id: 1,
      timestamp_us: 1708300800000000,
      channel: "fixed_rate@200ms",
      price: 5100000000000,
      best_bid_price: 5099900000000,
      best_ask_price: 5100100000000,
      confidence: 1000000,
      exponent: -8,
      publisher_count: 5,
      evm: "0xdeadbeef",
      solana: "base64data",
      leUnsigned: "binary1",
      leSigned: "binary2",
    },
  ],
};

const handlers = [
  http.post(`${ROUTER_URL}/v1/latest_price`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
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

  it("returns parsed feeds with binary fields stripped", async () => {
    const feeds = await client.getLatestPrice("test-token", ["BTC/USD"]);
    expect(feeds).toHaveLength(1);
    expect(feeds[0].price_feed_id).toBe(1);
    // Binary fields should be stripped
    expect(feeds[0]).not.toHaveProperty("evm");
    expect(feeds[0]).not.toHaveProperty("solana");
    expect(feeds[0]).not.toHaveProperty("leUnsigned");
    expect(feeds[0]).not.toHaveProperty("leSigned");
  });

  it("sends Authorization header", async () => {
    const feeds = await client.getLatestPrice("my-secret-token", ["BTC/USD"]);
    expect(feeds).toHaveLength(1);
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
