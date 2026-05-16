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
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          }}
        >
          500
        </p>
        <h1
          style={{
            marginTop: "1rem",
            fontSize: "1.875rem",
            fontWeight: 600,
          }}
        >
          Uygulama beklenmedik bir hata ile karsilasti
        </h1>
        <p
          style={{
            marginTop: "0.75rem",
            color: "#a3a3a3",
            maxWidth: "30rem",
            marginInline: "auto",
          }}
        >
          Sorunu otomatik olarak kaydettik. Tekrar denemeyi veya sayfayi
          yenilemeyi deneyebilirsiniz.
        </p>
        {error.digest ? (
          <p
            style={{
              marginTop: "0.5rem",
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
            padding: "0.5rem 1.25rem",
            background: "#fafafa",
            color: "#0a0a0a",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
