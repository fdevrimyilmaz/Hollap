"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type CertificateData = {
  eligible: boolean;
  completedCount: number;
  requiredCount: number;
  product: { id: string; name: string; creatorName: string };
  learner: { id: string; name: string };
  issuedAt: string | null;
  certificateId: string | null;
};

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<CertificateData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(id)}/certificate`, {
          cache: "no-store",
        });
        if (response.status === 401) {
          router.push(`/login?next=/certificate/${id}`);
          return;
        }
        if (!response.ok) {
          setError("Sertifika bilgileri alınamadı");
          return;
        }
        const payload = (await response.json()) as CertificateData;
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setError("Sertifika bilgileri alınamadı");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </main>
    );
  }

  if (!data.eligible) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center glass-card rounded-2xl p-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-display font-bold text-white mb-2">Sertifika henüz hazır değil</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Sertifikayı almak için tüm dersleri tamamlamalısın.
            <br />
            <span className="text-white font-medium tabular-nums">
              {data.completedCount}/{data.requiredCount}
            </span>{" "}
            ders tamamlandı.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button asChild className="gradient-bg text-white border-0">
              <Link href={`/watch/${id}`}>Derslere Dön</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/15 bg-white/[0.02]">
              <Link href={`/course/${id}`}>Kurs Sayfası</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const issuedDate = data.issuedAt
    ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(data.issuedAt),
      )
    : "";

  return (
    <main className="min-h-screen bg-background p-6 print:bg-white">
      {/* Action bar (hidden when printing) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]">
          <Link href={`/course/${id}`}>← Kursa Dön</Link>
        </Button>
        <Button onClick={() => window.print()} className="gradient-bg text-white border-0 font-medium">
          PDF Olarak Yazdır
        </Button>
      </div>

      {/* The certificate itself */}
      <div
        className="max-w-3xl mx-auto rounded-2xl bg-[#fdf8f0] text-[#1c1814] p-12 ring-8 ring-[#d4a747] print:ring-4 print:rounded-none print:max-w-none"
        style={{ aspectRatio: "1.414/1" }}
      >
        <div className="border-4 border-[#d4a747]/40 h-full flex flex-col items-center justify-center text-center p-8">
          <div className="text-xs uppercase tracking-[0.4em] text-[#a87c1a] font-bold mb-2">
            Hollap
          </div>
          <h1
            className="text-4xl sm:text-5xl font-serif font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Tamamlama Sertifikası
          </h1>
          <div className="w-24 h-0.5 bg-[#d4a747] my-6" />

          <p className="text-sm uppercase tracking-widest text-[#7a6535] mb-3">Bu sertifika</p>
          <p
            className="text-3xl sm:text-4xl font-semibold mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {data.learner.name}
          </p>
          <p className="text-sm max-w-xl leading-relaxed mb-2 text-[#3a2f1f]">
            kullanıcısının aşağıdaki kursu başarıyla tamamladığını teyit eder:
          </p>
          <p className="text-xl sm:text-2xl font-semibold italic mb-2 text-[#5c4a25]">
            &ldquo;{data.product.name}&rdquo;
          </p>
          <p className="text-sm text-[#7a6535] mb-8">Eğitmen: {data.product.creatorName}</p>

          <div className="w-24 h-0.5 bg-[#d4a747] mb-6" />

          <div className="grid grid-cols-2 gap-12 text-center w-full max-w-md">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#7a6535] mb-1">Veriliş Tarihi</p>
              <p className="text-base font-semibold">{issuedDate}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#7a6535] mb-1">Sertifika No</p>
              <p className="text-sm font-mono font-semibold">{data.certificateId}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
