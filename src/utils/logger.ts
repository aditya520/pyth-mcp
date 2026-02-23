import pino from "pino";
import type { Config } from "../config.js";

export function createLogger(config: Config): pino.Logger {
  return pino({
    level: config.logLevel,
    transport: {
      target: "pino/file",
      options: { destination: 2 }, // stderr
    },
  });
}

export function logToolCall(
  logger: pino.Logger,
  toolName: string,
  status: "success" | "error",
  latencyMs: number,
  hasToken: boolean,
  errorType?: string,
): void {
  logger.info({
    tool: toolName,
    status,
    latency_ms: latencyMs,
    has_token: hasToken,
    ...(errorType && { error_type: errorType }),
  });
}
