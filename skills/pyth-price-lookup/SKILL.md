---
name: pyth-price-lookup
description: >
  Look up any asset price using Pyth Pro MCP tools. Handles feed discovery,
  real-time prices, and historical point-in-time prices. Use when the user asks
  about current or past prices, wants to check what an asset is worth, find a
  price feed, look up a token, stock, forex pair, commodity, or metal price, or
  needs to convert a Pyth symbol to a price. Covers crypto, equities, FX, metals,
  rates, commodities, and funding rates.
compatibility: Requires the Pyth Pro MCP server (pyth-pro) to be connected.
metadata:
  author: pyth-network
  version: "1.0"
---

# Pyth Price Lookup

**Golden rule: always discover before you fetch.** Call `get_symbols` first to find the full symbol (e.g. `Crypto.BTC/USD`), then call a price tool. Never guess a symbol — bare names like `BTC/USD` will fail.

## Which tool do I need?

| User wants... | Tool | Auth required? |
|--------------|------|----------------|
| Find what feeds exist | `get_symbols` | No |
| Current real-time price | `get_latest_price` | Yes — `access_token` |
| Price at a past timestamp | `get_historical_price` | No |

## Step 1: Discover the feed

Call `get_symbols` to search by name, symbol, or description:

```json
{ "query": "bitcoin" }
```

- `"apple"` finds `Equity.US.AAPL/USD` (matches description "Apple Inc.")
- `"gold"` finds `Metal.XAU/USD`
- `"BTC"` finds `Crypto.BTC/USD` and related feeds

Narrow results with `asset_type`:

```json
{ "query": "gold", "asset_type": "metal" }
```

Valid types: `crypto`, `equity`, `fx`, `metal`, `rates`, `commodity`, `funding-rate`.

From the response, grab the `symbol` field — that's what you pass to price tools.

## Step 2: Fetch the price

### Real-time: `get_latest_price`

**Requires an access token.** If the user hasn't provided one, tell them to get it at https://pyth.network/pricing. Do not attempt the call without it.

```json
{
  "symbols": ["Crypto.BTC/USD", "Crypto.ETH/USD"],
  "access_token": "<user's token>"
}
```

- Symbols must be the **full name with prefix** from `get_symbols`.
- Max 100 feeds per request.
- Response includes `display_price` — use it directly for human-readable output.

### Historical: `get_historical_price`

```json
{
  "symbols": ["Crypto.BTC/USD"],
  "timestamp": 1745193600
}
```

- Accepts Unix seconds, milliseconds, or microseconds (auto-detected).
- **Data starts April 2025.** Do not request earlier timestamps.
- Max 50 feeds per request.
- Response includes `display_price`.

You can also use `price_feed_ids` (numeric IDs from `get_symbols`) instead of `symbols`.

## Understanding prices

Pyth prices are integers with an `exponent` field. The human-readable value is `price * 10^exponent`. A pre-computed `display_price` is included in every response — use it directly.

## Critical mistakes to avoid

**Never use a bare symbol.** `BTC/USD` fails. Always use the full prefixed symbol from `get_symbols`, like `Crypto.BTC/USD`.

**Never call `get_latest_price` without an access token.** It will return an auth error. Ask the user for their token first.

**Never request historical data before April 2025.** There is no data available before that date.

## Example: "What's the price of gold?"

1. `get_symbols` with `{ "query": "gold", "asset_type": "metal" }` — finds `Metal.XAU/USD`
2. `get_latest_price` with `{ "symbols": ["Metal.XAU/USD"], "access_token": "..." }`
3. Present `display_price` from the response

## Example: "What was ETH worth on May 1, 2025?"

1. `get_symbols` with `{ "query": "ETH", "asset_type": "crypto" }` — finds `Crypto.ETH/USD`
2. Convert date: May 1, 2025 00:00 UTC = `1746057600` (Unix seconds)
3. `get_historical_price` with `{ "symbols": ["Crypto.ETH/USD"], "timestamp": 1746057600 }`
4. Present `display_price` from the response
