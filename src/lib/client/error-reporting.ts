// Vendor-agnostic client-side error reporter.
//
// Always logs to the browser console so dev feedback is identical to before.
// When NEXT_PUBLIC_ERROR_REPORT_URL is configured, also POSTs a structured
// payload to that URL via fetch + keepalive. The endpoint shape is plain
// JSON, so any backend / proxy can ingest it — Sentry tunnel, a custom
// /api/errors route, Logflare, etc.
//
// To wire @sentry/nextjs natively, install the SDK and replace the body of
// dispatch() with Sentry.captureException(error, { extra: payload }).

type ErrorContext = {
  source: string;
  digest?: string;
  url?: string;
  userAgent?: string;
  [key: string]: unknown;
};

type ErrorPayload = {
  message: string;
  stack?: string;
  name: string;
  context: ErrorContext;
  timestamp: string;
  release?: string;
};

function getReportUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_ERROR_REPORT_URL;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildPayload(error: unknown, context: ErrorContext): ErrorPayload {
  const baseContext: ErrorContext = {
    ...context,
    url:
      context.url ??
      (typeof window !== "undefined" ? window.location.href : undefined),
    userAgent:
      context.userAgent ??
      (typeof navigator !== "undefined" ? navigator.userAgent : undefined),
  };

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context: baseContext,
      timestamp: new Date().toISOString(),
      release: process.env.NEXT_PUBLIC_APP_RELEASE,
    };
  }

  return {
    message: typeof error === "string" ? error : "Non-Error thrown",
    name: "UnknownError",
    context: { ...baseContext, raw: error },
    timestamp: new Date().toISOString(),
    release: process.env.NEXT_PUBLIC_APP_RELEASE,
  };
}

function dispatch(payload: ErrorPayload): void {
  const url = getReportUrl();
  if (!url) return;

  try {
    // keepalive lets the request survive page transitions / unloads.
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    }).catch(() => {
      // Swallow: an error reporter must never throw.
    });
  } catch {
    // Defensive: fetch can throw synchronously in exotic runtimes.
  }
}

export function reportClientError(
  error: unknown,
  context: ErrorContext
): void {
  const payload = buildPayload(error, context);
  console.error(`[${context.source}]`, error, payload.context);
  dispatch(payload);
}
