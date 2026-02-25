---
name: pyth-feed-explorer
description: >
  Browse and explore the Pyth Pro price feed catalog. Use when the user wants to
  see what feeds are available, list feeds by asset type, count feeds, understand
  the catalog structure, browse crypto/equity/fx/metal/rates/commodity feeds,
  check if a specific asset is supported, or access the full feed catalog in bulk.
compatibility: Requires the Pyth Pro MCP server (pyth-pro) to be connected.
metadata:
  author: pyth-network
  version: "1.0"
---

# Pyth Feed Explorer

**Golden rule: use `get_symbols` for search and filtering, use resources for bulk dumps.** Don't fetch the entire catalog just to find one feed — search for it. Don't paginate through hundreds of results when a resource gives you everything at once.

## Which approach do I need?

| User wants... | Use | Why |
|--------------|-----|-----|
| Find a specific asset | `get_symbols` with `query` | Searches name, symbol, and description |
| List one asset type | `get_symbols` with `asset_type` | Filtered, paginated results |
| Count feeds | `get_symbols` with `limit: 1` | Read `total_available` without fetching everything |
| Dump full catalog | Resource `pyth://feeds` | Returns all feeds at once |
| Dump one asset type | Resource `pyth://feeds/{type}` | Returns all feeds of that type |
| Browse page by page | `get_symbols` with `offset`/`limit` | Paginated exploration |

## The 7 asset types

| Type | Symbol prefix | Examples |
|------|--------------|----------|
| `crypto` | `Crypto.` | `Crypto.BTC/USD`, `Crypto.ETH/USD`, `Crypto.SOL/USD` |
| `equity` | `Equity.US.` | `Equity.US.AAPL/USD`, `Equity.US.TSLA/USD` |
| `fx` | `FX.` | `FX.EUR/USD`, `FX.GBP/USD` |
| `metal` | `Metal.` | `Metal.XAU/USD`, `Metal.XAG/USD` |
| `rates` | `Rates.` | Interest rate feeds |
| `commodity` | `Commodity.` | Commodity price feeds |
| `funding-rate` | `FundingRate.` | Crypto funding rate feeds |

## Searching with `get_symbols`

```json
{ "query": "apple", "asset_type": "equity" }
```

All parameters are optional. Search matches against `name`, `symbol`, and `description` — so `"apple"` finds Apple Inc. even though the symbol is `AAPL`.

Pagination: default 50 per page, max 200. Response includes `has_more` and `next_offset`.

## Bulk access with resources

| Resource URI | Returns |
|-------------|---------|
| `pyth://feeds` | All feeds, all types |
| `pyth://feeds/crypto` | All crypto feeds |
| `pyth://feeds/equity` | All equity feeds |
| `pyth://feeds/fx` | All FX feeds |
| `pyth://feeds/metal` | All metal feeds |
| `pyth://feeds/rates` | All rates feeds |
| `pyth://feeds/commodity` | All commodity feeds |
| `pyth://feeds/funding-rate` | All funding-rate feeds |

## Feed metadata fields

Each feed includes:

| Field | What it's for |
|-------|--------------|
| `symbol` | Full prefixed symbol — pass to price tools (e.g. `Crypto.BTC/USD`) |
| `pyth_lazer_id` | Numeric ID — alternative identifier for price tools |
| `name` | Human-readable name (e.g. "Bitcoin") |
| `description` | Longer text, matched by search (e.g. "Apple Inc.") |
| `asset_type` | One of the 7 types above |
| `exponent` | Power of 10 for raw-to-readable price conversion |

**`symbol` is what you pass to other tools.** Don't confuse it with `name`.

## Pagination pattern

When `has_more` is `true`, fetch the next page:

```json
{ "asset_type": "crypto", "offset": 50, "limit": 50 }
```

Continue until `has_more` is `false`.

To count without fetching: use `limit: 1` and read `total_available`.

## Critical mistakes to avoid

**Never fetch all feeds just to count them.** Use `{ "limit": 1 }` and read `total_available`.

**Never confuse `name` with `symbol`.** `name` is human-readable ("Bitcoin"). `symbol` is the tool parameter (`Crypto.BTC/USD`).

**Never use resources when you need search.** Resources dump everything — use `get_symbols` with `query` to find specific feeds.

## Example: "What feeds does Pyth have?"

1. `get_symbols` with `{}` — get the first page and `total_available`
2. Summarize: "Pyth has N feeds across 7 asset types: crypto, equity, fx, metal, rates, commodity, funding-rate"
3. Offer to drill into any specific type

## Example: "Does Pyth have Apple stock?"

1. `get_symbols` with `{ "query": "apple", "asset_type": "equity" }`
2. Found → show `Equity.US.AAPL/USD` with its name and description
3. Not found → tell the user it's not available

## Example: "How many crypto feeds are there?"

1. `get_symbols` with `{ "asset_type": "crypto", "limit": 1 }`
2. Read `total_available` from the response — that's the count
