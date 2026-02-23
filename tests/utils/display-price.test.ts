import { describe, it, expect } from "vitest";
import { addDisplayPrices } from "../../src/utils/display-price.js";

describe("addDisplayPrices", () => {
  it("computes display_price from price and exponent", () => {
    // BTC at $97,423.50: raw = 9742350000000, exponent = -8
    const feed = { price: 9742350000000, exponent: -8 };
    const result = addDisplayPrices(feed);
    expect(result.display_price).toBeCloseTo(97423.5, 2);
  });

  it("computes display_bid and display_ask", () => {
    const feed = {
      price: 9742350000000,
      best_bid_price: 9742340000000,
      best_ask_price: 9742360000000,
      exponent: -8,
    };
    const result = addDisplayPrices(feed);
    expect(result.display_price).toBeCloseTo(97423.5, 2);
    expect(result.display_bid).toBeCloseTo(97423.4, 2);
    expect(result.display_ask).toBeCloseTo(97423.6, 2);
  });

  it("omits display fields when price is null", () => {
    const feed = { price: null, exponent: -8 };
    const result = addDisplayPrices(feed);
    expect(result.display_price).toBeUndefined();
  });

  it("omits display fields when price is undefined", () => {
    const feed = { exponent: -8 };
    const result = addDisplayPrices(feed);
    expect(result.display_price).toBeUndefined();
  });

  it("handles exponent of 0", () => {
    const feed = { price: 100, exponent: 0 };
    const result = addDisplayPrices(feed);
    expect(result.display_price).toBe(100);
  });

  it("handles missing exponent (defaults to 0)", () => {
    const feed = { price: 42 };
    const result = addDisplayPrices(feed);
    expect(result.display_price).toBe(42);
  });
});
