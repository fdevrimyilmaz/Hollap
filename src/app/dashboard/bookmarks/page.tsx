"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ToastProvider";

type Bookmark = {
  id: string;
  productId: string;
  createdAt: string;
  productName: string;
  priceCents: number;
  thumbnailUrl: string | null;
  creatorName: string;
};

const FALLBACK_THUMB = "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop";

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" });
        if (!me.ok) {
          router.push("/login");
          return;
        }
        const response = await fetch("/api/bookmarks", { cache: "no-store" });
        if (!response.ok) throw new Error("Kayıtlar yüklenemedi");
        const payload = (await response.json()) as { bookmarks: Bookmark[] };
        setBookmarks(payload.bookmarks);
      } catch (err) {
        showToast.error(
          "Yüklenemedi",
          err instanceof Error ? err.message : "Bilinmeyen hata",
        );
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [router]);

  const removeBookmark = async (productId: string) => {
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) throw new Error("Kayıt kaldırılamadı");
      setBookmarks((prev) => prev.filter((b) => b.productId !== productId));
      showToast.success("Kayıt kaldırıldı", "Listenden çıkarıldı");
    } catch (err) {
      showToast.error(
        "İşlem başarısız",
        err instanceof Error ? err.message : "Bilinmeyen hata",
      );
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Kayıtlarım</h1>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-white font-semibold tabular-nums">{bookmarks.length}</span> kayıtlı içerik
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
            <Link href="/dashboard">← Panele Dön</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl shimmer" />
            ))}
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center max-w-xl mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Henüz kayıt yok</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Kurs sayfalarındaki yer imi butonuyla daha sonra incelemek için kaydedebilirsin.
            </p>
            <Button asChild className="gradient-bg text-white border-0">
              <Link href="/explore">Keşfet</Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="glass-card rounded-2xl overflow-hidden flex flex-col">
                <Link href={`/course/${bookmark.productId}`} className="relative aspect-video block group">
                  <Image
                    src={bookmark.thumbnailUrl ?? FALLBACK_THUMB}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </Link>
                <div className="p-4 flex-1 flex flex-col">
                  <Link href={`/course/${bookmark.productId}`}>
                    <h3 className="text-base font-semibold text-white hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                      {bookmark.productName}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">{bookmark.creatorName}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <span className="text-lg font-display font-bold text-white tabular-nums">
                      ${(bookmark.priceCents / 100).toFixed(0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeBookmark(bookmark.productId)}
                      className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
