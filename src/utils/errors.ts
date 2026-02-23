export function toolError(message: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export const ErrorMessages = {
  MISSING_TOKEN:
    "This tool requires a Pyth Pro access token. Provide an `access_token` parameter. Get a token at https://pyth.network/pricing",
  INVALID_TOKEN:
    "Your Pyth Pro access token is invalid or expired. Check your `access_token` value.",
  FEED_NOT_FOUND: (input: string) =>
    `Feed not found: ${input}. Use get_symbols to discover available feeds.`,
  NO_DATA: "No candlestick data available for the requested range. Try a different time range or symbol.",
} as const;
