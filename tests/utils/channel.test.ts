import { describe, it, expect } from "vitest";
import { resolveChannel } from "../../src/utils/channel.js";
import type { Config } from "../../src/config.js";

const baseConfig: Config = {
  channel: "fixed_rate@200ms",
  routerUrl: "https://pyth-lazer.dourolabs.app",
  historyUrl: "https://history.pyth-lazer.dourolabs.app",
  logLevel: "info",
  requestTimeoutMs: 10000,
};

describe("resolveChannel", () => {
  it("uses per-tool channel when provided", () => {
    expect(resolveChannel("real_time", baseConfig)).toBe("real_time");
  });

  it("falls back to config channel", () => {
    expect(resolveChannel(undefined, baseConfig)).toBe("fixed_rate@200ms");
  });

  it("uses config custom channel", () => {
    const config = { ...baseConfig, channel: "fixed_rate@1000ms" };
    expect(resolveChannel(undefined, config)).toBe("fixed_rate@1000ms");
  });
});
