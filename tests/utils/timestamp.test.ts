import { describe, it, expect } from "vitest";
import { normalizeTimestampToMicroseconds, alignTimestampToChannel } from "../../src/utils/timestamp.js";

describe("normalizeTimestampToMicroseconds", () => {
  it("converts seconds (10 digits) to microseconds", () => {
    const ts = 1708300800; // Feb 19, 2024
    expect(normalizeTimestampToMicroseconds(ts)).toBe(ts * 1_000_000);
  });

  it("converts milliseconds (13 digits) to microseconds", () => {
    const ts = 1708300800000;
    expect(normalizeTimestampToMicroseconds(ts)).toBe(ts * 1_000);
  });

  it("passes microseconds (16 digits) through unchanged", () => {
    const ts = 1708300800000000;
    expect(normalizeTimestampToMicroseconds(ts)).toBe(ts);
  });

  it("handles small timestamps (e.g. epoch year 2001) as seconds", () => {
    const ts = 1000000000; // Sep 2001
    expect(normalizeTimestampToMicroseconds(ts)).toBe(ts * 1_000_000);
  });

  it("handles boundary between seconds and milliseconds (11 digits) as ms", () => {
    const ts = 10000000000; // 11 digits — this is actually seconds (year 2286) but >10 digits
    // 11 digits falls into ms range (<=13)
    expect(normalizeTimestampToMicroseconds(ts)).toBe(ts * 1_000);
  });
});

describe("alignTimestampToChannel", () => {
  it("rounds down to nearest 200,000μs for fixed_rate@200ms", () => {
    // 1708300800000000 + 150000 = not aligned
    const ts = 1708300800150000;
    expect(alignTimestampToChannel(ts, "fixed_rate@200ms")).toBe(1708300800000000);
  });

  it("rounds down to nearest 50,000μs for fixed_rate@50ms", () => {
    const ts = 1708300800030000; // 30,000μs offset — not aligned to 50,000
    expect(alignTimestampToChannel(ts, "fixed_rate@50ms")).toBe(1708300800000000);
  });

  it("passes through unchanged for real_time channel", () => {
    const ts = 1708300800123456;
    expect(alignTimestampToChannel(ts, "real_time")).toBe(ts);
  });

  it("returns same value when already aligned", () => {
    const ts = 1708300800200000; // divisible by 200,000
    expect(alignTimestampToChannel(ts, "fixed_rate@200ms")).toBe(ts);
  });
});
