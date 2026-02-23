# Pyth Pro MCP Server

## Project Plan
The full architecture and implementation plan is at `docs/PLAN.md`. Read it before
making any changes.

## Key Commands
- `npm run build` — Build the project
- `npm test` — Run tests
- `npm run dev` — Start in stdio dev mode

## Conventions
- TypeScript, strict mode
- Zod for all input validation
- pino logger to stderr (never console.log)
- snake_case for tool names
- All tools are read-only
