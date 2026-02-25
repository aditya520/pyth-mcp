---
name: pyth-market-analysis
description: >
  Fetch and analyze OHLC candlestick data from Pyth Pro for charting, technical
  analysis, and price trend research. Use when the user wants candlestick charts,
  price history over a range, daily/weekly/monthly candles, percentage change,
  high-low ranges, volatility, moving averages, side-by-side asset comparisons,
  or any form of market trend analysis using OHLC data.
compatibility: Requires the Pyth Pro MCP server (pyth-pro) to be connected.
metadata:
  author: pyth-network
  version: "1.0"
---

# Pyth Market Analysis

**Golden rule: pick the right resolution for the time range.** The API returns max 500 candles per request. If you request 1-minute candles over a month, you'll get truncated data. Match resolution to range.

## Workflow

1. **Discover the symbol** — call `get_symbols` to get the full prefixed symbol (e.g. `Crypto.BTC/USD`)
2. **Fetch candles** — call `get_candlestick_data` with symbol, resolution, from, to
3. **Analyze** — compute metrics from the OHLC arrays

## Choosing a resolution

Pick resolution based on the time range to stay under 500 candles:

| Time range | Use resolution | Candle count |
|------------|---------------|-------------|
| Last hour | `1` (1 min) | ~60 |
| Last 24 hours | `15` (15 min) | ~96 |
| Last week | `60` (1 hour) | ~168 |
| Last month | `D` (daily) | ~30 |
| Last 3 months | `D` (daily) | ~90 |
| Last year | `W` (weekly) | ~52 |

All resolution values: `1`, `5`, `15`, `30`, `60` (minutes), `120`, `240`, `360`, `720` (hours), `D` (daily), `W` (weekly), `M` (monthly).

## Fetching candles

```json
{
  "symbol": "Crypto.BTC/USD",
  "resolution": "D",
  "from": 1745193600,
  "to": 1745798400
}
```

**`from` and `to` must be Unix seconds.** Do not use milliseconds.

**Data starts April 2025.** Do not request earlier timestamps.

**`from` must be before `to`.**

### Response structure

The response contains parallel arrays — each index is one candle:

| Array | Meaning |
|-------|---------|
| `t` | Timestamps (Unix seconds) |
| `o` | Open prices |
| `h` | High prices |
| `l` | Low prices |
| `c` | Close prices |
| `v` | Volume |

If the result exceeds 500 candles, it's truncated with `truncated: true` and `total_available`. Narrow the range or increase the resolution.

## Analyzing the data

### Percentage change

```
% change = ((c[last] - o[0]) / o[0]) * 100
```

### Period high and low

```
high = max(h[])
low  = min(l[])
```

### Simple volatility

Compare `h[i] - l[i]` for each candle to see intra-period price swing.

### Normalized comparison (two assets)

To compare assets on the same scale, normalize each close to the first:

```
normalized[i] = c[i] / c[0]
```

Both start at 1.0 — values above 1.0 show gains, below show losses.

## Comparing two assets

Make two `get_candlestick_data` calls with the **same resolution, from, and to**:

1. `get_symbols` — find both symbols
2. `get_candlestick_data` for asset A
3. `get_candlestick_data` for asset B (same params except symbol)
4. Compare: % change, high/low, or normalized prices

## Critical mistakes to avoid

**Never use bare symbols.** `BTC/USD` fails — use `Crypto.BTC/USD` from `get_symbols`.

**Never pass millisecond timestamps.** `from` and `to` are Unix seconds only. Divide `Date.now()` by 1000.

**Never request 1-minute candles over a long range.** You'll hit the 500-candle cap. Use the resolution table above.

## Example: "BTC daily candles for the last week"

1. `get_symbols` with `{ "query": "BTC", "asset_type": "crypto" }` — finds `Crypto.BTC/USD`
2. Compute timestamps: `to` = current Unix seconds, `from` = `to - 604800`
3. `get_candlestick_data` with `{ "symbol": "Crypto.BTC/USD", "resolution": "D", "from": ..., "to": ... }`
4. Present each candle: date, open, high, low, close

## Example: "How has ETH performed vs BTC this month?"

1. Find both symbols via `get_symbols`
2. Fetch daily candles for both with the same time range
3. Compute % change for each: `((c[last] - o[0]) / o[0]) * 100`
4. Normalize both and present side-by-side
