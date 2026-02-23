import { z } from "zod";

// --- Zod Schemas (single source of truth) ---

export const FeedSchema = z.object({
  pyth_lazer_id: z.number(),
  name: z.string(),
  symbol: z.string(),
  description: z.string(),
  asset_type: z.string(),
  exponent: z.number(),
  min_channel: z.string(),
  state: z.string(),
  hermes_id: z.string().nullable(),
  quote_currency: z.string(),
});

export const FeedArraySchema = z.array(FeedSchema);

export const OHLCResponseSchema = z.object({
  s: z.enum(["ok", "no_data", "error"]),
  t: z.array(z.number()),
  o: z.array(z.number()),
  h: z.array(z.number()),
  l: z.array(z.number()),
  c: z.array(z.number()),
  v: z.array(z.number()),
  errmsg: z.string().optional(),
});

export const HistoricalPriceResponseSchema = z
  .object({
    price_feed_id: z.number(),
    channel: z.union([z.string(), z.number()]),
    publish_time: z.number(),
    price: z.number(),
    best_bid_price: z.number().nullable().optional(),
    best_ask_price: z.number().nullable().optional(),
    confidence: z.number().nullable().optional(),
    exponent: z.number().nullable().optional(),
    publisher_count: z.number().nullable().optional(),
  })
  .passthrough();

export const HistoricalPriceArraySchema = z.array(
  HistoricalPriceResponseSchema,
);

export const LatestPriceParsedFeedSchema = z
  .object({
    price_feed_id: z.number(),
    timestamp_us: z.number(),
    channel: z.string(),
    price: z.number().optional(),
    best_bid_price: z.number().optional(),
    best_ask_price: z.number().optional(),
    confidence: z.number().optional(),
    exponent: z.number().optional(),
    publisher_count: z.number().optional(),
  })
  .passthrough();

export const LatestPriceResponseSchema = z.object({
  parsed: z.array(LatestPriceParsedFeedSchema),
});

// --- Inferred Types ---

export type Feed = z.infer<typeof FeedSchema>;
export type OHLCResponse = z.infer<typeof OHLCResponseSchema>;
export type HistoricalPriceResponse = z.infer<
  typeof HistoricalPriceResponseSchema
>;
export type LatestPriceParsedFeed = z.infer<typeof LatestPriceParsedFeedSchema>;
export type LatestPriceResponse = z.infer<typeof LatestPriceResponseSchema>;

/** Binary fields to strip from router API responses */
export const BINARY_PAYLOAD_FIELDS = [
  "evm",
  "solana",
  "leUnsigned",
  "leSigned",
] as const;
