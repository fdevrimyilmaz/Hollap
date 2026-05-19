"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[GlobalErrorBoundary]", error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          padding: "6rem 1.5rem",
          fontFamily:
            "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          textAlign: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          minHeight: "100vh",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#a3a3a3",
            fontWeight: 500,
          }}
        >
          Hata 500
        </p>
        <h1
          style={{
            marginTop: "1rem",
            fontSize: "1.875rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Uygulama beklenmedik bir hatayla karşılaştı
        </h1>
        <p
          style={{
            marginTop: "0.75rem",
            color: "#a3a3a3",
            maxWidth: "30rem",
            marginInline: "auto",
            lineHeight: 1.6,
          }}
        >
          Sorunu otomatik olarak kaydettik. Tekrar denemeyi veya sayfayı yenilemeyi deneyebilirsin.
        </p>
        {error.digest ? (
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.75rem",
              color: "#737373",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            Referans: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "2rem",
            padding: "0.625rem 1.5rem",
            background: "linear-gradient(135deg, #f97316, #f59e0b)",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.625rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 8px 24px -8px rgba(249, 115, 22, 0.5)",
          }}
        >
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
