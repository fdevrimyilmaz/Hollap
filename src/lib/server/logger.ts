import { createId } from "@/lib/server/db";

type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function emit(level: LogLevel, message: string, meta?: LogMeta): void {
  const payload: Record<string, unknown> = {
    id: createId("log"),
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function logInfo(message: string, meta?: LogMeta): void {
  emit("info", message, meta);
}

export function logWarn(message: string, meta?: LogMeta): void {
  emit("warn", message, meta);
}

export function logError(message: string, meta?: LogMeta): void {
  emit("error", message, meta);
}