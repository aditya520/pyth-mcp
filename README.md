# @pyth-network/mcp-server

MCP server for Pyth Pro real-time and historical market data. Provides AI assistants with access to crypto, equity, FX, metals, and commodity prices.

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
| `pyth://feeds` | Full feed catalog (cached 1 day) |
| `pyth://feeds/{asset_type}` | Feeds filtered by asset type |

## Installation

```bash
npm install @pyth-network/mcp-server
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PYTH_CHANNEL` | `fixed_rate@200ms` | Default price channel |
| `PYTH_ROUTER_URL` | `https://pyth-lazer.dourolabs.app` | Router API base URL |
| `PYTH_HISTORY_URL` | `https://history.pyth-lazer.dourolabs.app` | History API base URL |
| `PYTH_LOG_LEVEL` | `info` | Log level: debug, info, warn, error |
| `PYTH_REQUEST_TIMEOUT_MS` | `10000` | HTTP request timeout in ms |

`get_latest_price` requires an `access_token` parameter — get one at [pyth.network/pricing](https://pyth.network/pricing).

## Claude Desktop Setup

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "pyth-pro": {
      "command": "npx",
      "args": ["@pyth-network/mcp-server"]
    }
  }
}
```

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
