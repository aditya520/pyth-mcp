# @pyth-network/mcp-server

MCP server for [Pyth Pro](https://pyth.network/pricing) real-time and historical market data. Gives AI assistants access to crypto, equity, FX, metals, and commodity price feeds via the [Model Context Protocol](https://modelcontextprotocol.io/).

## Tools

| Tool | Description | Auth |
|------|-------------|------|
| `get_symbols` | Search and list available price feeds | None |
| `get_candlestick_data` | OHLC candlestick data for charting | None |
| `get_historical_price` | Price at a specific historical timestamp | None |
| `get_latest_price` | Real-time latest prices | `access_token` param required |

## Resources

| URI | Description |
|-----|-------------|
| `pyth://feeds` | Full feed catalog |
| `pyth://feeds/{asset_type}` | Feeds filtered by asset type |

## Quickstart

```bash
git clone https://github.com/aditya520/pyth-mcp.git
cd pyth-mcp
npm install
npm run build
```

## Configuration

All configuration is optional. Defaults work out of the box for public endpoints.

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PYTH_CHANNEL` | `fixed_rate@200ms` | Default price channel |
| `PYTH_ROUTER_URL` | `https://pyth-lazer.dourolabs.app` | Router API base URL |
| `PYTH_HISTORY_URL` | `https://history.pyth-lazer.dourolabs.app` | History API base URL |
| `PYTH_LOG_LEVEL` | `info` | Log level: debug, info, warn, error |
| `PYTH_REQUEST_TIMEOUT_MS` | `10000` | HTTP request timeout in ms |

`get_latest_price` requires an `access_token` parameter — get one at [pyth.network/pricing](https://pyth.network/pricing).

---

## Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a web-based UI for testing MCP servers interactively. It connects to your server over stdio and lets you call tools, read resources, and see raw JSON-RPC messages.

### 1. Build the server

```bash
npm run build
```

### 2. Launch Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens the Inspector UI in your browser (typically `http://localhost:6274`). The server starts automatically as a child process.

### 3. Test each tool

#### get_symbols — Search for feeds

Click **Tools** in the sidebar, select `get_symbols`, and try these inputs:

| Test | Input | What to expect |
|------|-------|----------------|
| Browse all feeds | `{}` | First 50 feeds, `total_available` shows full count, `has_more: true` |
| Search by name | `{ "query": "apple" }` | Returns Apple Inc. feed (matched via `name` field client-side) |
| Search by symbol | `{ "query": "BTC" }` | Returns Bitcoin-related feeds |
| Filter by asset type | `{ "asset_type": "equity" }` | Only equity feeds |
| Combined filter | `{ "query": "gold", "asset_type": "metal" }` | Gold metal feeds only |
| Paginate | `{ "offset": 50, "limit": 10 }` | 10 feeds starting from position 50 |

Note the `pyth_lazer_id` and `symbol` fields in the response — you'll need them for the other tools.

#### get_candlestick_data — OHLC candles

Select `get_candlestick_data`. The `symbol` must be the **full symbol** from `get_symbols` (with asset type prefix).

```json
{
  "symbol": "Crypto.BTC/USD",
  "resolution": "60",
  "from": 1745193600,
  "to": 1745280000
}
```

- `resolution`: `1`, `5`, `15`, `30`, `60` (minutes), `120`, `240`, `360`, `720` (hours), `D` (daily), `W` (weekly), `M` (monthly)
- `from`/`to`: Unix timestamps in **seconds**
- Historical data is available from **April 2025** onward

Response includes `t` (timestamps), `o` (open), `h` (high), `l` (low), `c` (close), `v` (volume) arrays.

#### get_historical_price — Price at a point in time

Select `get_historical_price`. Use either `symbols` or `price_feed_ids` (at least one required).

```json
{
  "symbols": ["BTC/USD"],
  "timestamp": 1745193600
}
```

Or by feed ID:

```json
{
  "price_feed_ids": [1],
  "timestamp": 1745193600
}
```

- `timestamp` accepts Unix seconds, milliseconds, or microseconds (auto-detected)
- Prices are integers — use the `exponent` field to compute human-readable price: `price * 10^exponent`
- `display_price` is included for convenience

#### get_latest_price — Real-time price (requires auth)

Select `get_latest_price`. This tool requires a Pyth Pro access token.

```json
{
  "symbols": ["BTC/USD", "ETH/USD"],
  "access_token": "your-pyth-pro-token"
}
```

Get a token at [pyth.network/pricing](https://pyth.network/pricing). Without a valid token you'll see: `"Access token is required. Get one at https://docs.pyth.network/price-feeds/pro/acquire-access-token"`.

### 4. Test resources

Click **Resources** in the sidebar:

- `pyth://feeds` — Returns the full feed catalog
- `pyth://feeds/crypto` — Only crypto feeds (replace `crypto` with any asset type: `equity`, `fx`, `metal`, `rates`, `commodity`, `funding-rate`)

---

## Testing with Claude Code

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) is Anthropic's CLI agent. You can add this MCP server so Claude Code can call the tools during conversations.

### 1. Build the server

```bash
npm run build
```

### 2. Add the MCP server to Claude Code

From the project directory, run:

```bash
claude mcp add pyth-pro node /absolute/path/to/pyth-mcp/dist/index.js
```

Replace `/absolute/path/to/pyth-mcp` with the actual path. For example:

```bash
claude mcp add pyth-pro node ~/pyth/pyth-mcp/dist/index.js
```

This saves the server config to `.claude/settings.local.json`. To add it globally (available in all projects):

```bash
claude mcp add --scope user pyth-pro node ~/pyth/pyth-mcp/dist/index.js
```

### 3. Verify the server is registered

```bash
claude mcp list
```

You should see `pyth-pro` with status `connected` or `enabled`.

### 4. Start Claude Code and test

```bash
claude
```

Try these prompts:

| Prompt | Expected behavior |
|--------|-------------------|
| "What crypto feeds are available on Pyth?" | Calls `get_symbols` with `asset_type: "crypto"` |
| "Search for apple on Pyth" | Calls `get_symbols` with `query: "apple"`, finds AAPL |
| "Show me BTC/USD daily candles for the last week" | Calls `get_symbols` to find the symbol, then `get_candlestick_data` |
| "What was the price of ETH yesterday at noon UTC?" | Calls `get_historical_price` with the right timestamp |
| "What's the current price of BTC?" | Calls `get_latest_price` — will fail without a token, which is expected |

### 5. Remove the server (optional)

```bash
claude mcp remove pyth-pro
```

---

## Claude Desktop Setup

Add to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pyth-pro": {
      "command": "node",
      "args": ["/absolute/path/to/pyth-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop after saving. The Pyth tools will appear in the tool picker.

---

## Development

```bash
npm install
npm run build
npm test
npm run dev       # Start in stdio mode
```

## Example Queries

- "What crypto feeds are available on Pyth?"
- "What's the current price of BTC/USD?"
- "Show me ETH/USD daily candles for the last month"
- "What was the price of gold at noon UTC yesterday?"
- "Search for apple stock on Pyth"
