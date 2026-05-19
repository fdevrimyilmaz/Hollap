import { createId } from "@/lib/server/db";

type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function getErrorForwardingUrl(): string | null {
  const raw = process.env.ERROR_REPORT_URL;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Fire-and-forget error forwarding. Never awaited so log calls stay
// synchronous from the caller's point of view. Swallows all failures —
// an error reporter must never throw or block.
function forwardError(payload: Record<string, unknown>): void {
  const url = getErrorForwardingUrl();
  if (!url) return;

  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // intentional: never escalate logger failures
    });
  } catch {
    // intentional: never escalate logger failures
  }
}

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
    forwardError(payload);
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