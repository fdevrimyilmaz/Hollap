"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client/error-reporting";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    reportClientError(error, {
      source: "ErrorBoundary",
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-24 text-center overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-500/15 rounded-full blur-[150px]" aria-hidden="true" />

      <div className="relative z-10 max-w-lg">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Hata 500</p>
        <h1 className="mt-3 text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
          Beklenmedik bir hata oluştu
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          Sorunu kayıt altına aldık. Sayfayı yenilemeyi deneyebilir veya anasayfaya dönebilirsin.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-muted-foreground/80">
            Referans: <span className="font-mono text-orange-400/80">{error.digest}</span>
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset} className="gradient-bg text-white border-0 shadow-lg shadow-orange-500/25 h-11 px-6 font-medium">
            Tekrar dene
          </Button>
          <Button asChild variant="outline" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 h-11 px-6 font-medium">
            <Link href="/">Anasayfaya dön</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
