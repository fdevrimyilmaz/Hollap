"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Surface in console for now; observability wiring (Sentry, Logflare,
    // Datadog Browser SDK) plugs in here in Phase 5.
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        500
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Beklenmedik bir hata olustu
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground">
        Sorunu kayit altina aldik. Sayfayi yenilemeyi deneyebilir veya
        anasayfaya donebilirsiniz.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted-foreground/80">
          Referans: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Tekrar dene</Button>
        <Button asChild variant="outline">
          <Link href="/">Anasayfaya don</Link>
        </Button>
      </div>
    </main>
  );
}
