import type pino from "pino";
import type { Config } from "../config.js";
import type { LatestPriceParsedFeed } from "./types.js";
import { BINARY_PAYLOAD_FIELDS, LatestPriceResponseSchema } from "./types.js";
import { HttpError, withRetry, parseRetryAfter } from "./retry.js";

export class RouterClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    config: Config,
    private readonly logger: pino.Logger,
  ) {
    this.baseUrl = config.routerUrl;
    this.timeoutMs = config.requestTimeoutMs;
  }

  async getLatestPrice(
    token: string,
    symbols?: string[],
    priceFeedIds?: number[],
    properties?: string[],
    channel?: string,
  ): Promise<LatestPriceParsedFeed[]> {
    const url = new URL("/v1/latest_price", this.baseUrl);

    const body: Record<string, unknown> = {};
    if (symbols?.length) body.symbols = symbols;
    if (priceFeedIds?.length) body.price_feed_ids = priceFeedIds;
    if (properties?.length) body.properties = properties;
    if (channel) body.channel = channel;

    return withRetry(async () => {
      this.logger.debug({ url: url.toString() }, "POST latest_price");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!res.ok) {
        throw new HttpError(
          res.status,
          `Router API /v1/latest_price returned ${res.status}`,
          parseRetryAfter(res),
        );
      }

      const json: unknown = await res.json();
      const data = LatestPriceResponseSchema.parse(json);
      return stripBinaryFields(data.parsed);
    });
  }
}

function stripBinaryFields(
  feeds: LatestPriceParsedFeed[],
): LatestPriceParsedFeed[] {
  return feeds.map((feed) => {
    const cleaned = { ...feed };
    for (const field of BINARY_PAYLOAD_FIELDS) {
      delete (cleaned as Record<string, unknown>)[field];
    }
    return cleaned;
  });
}
