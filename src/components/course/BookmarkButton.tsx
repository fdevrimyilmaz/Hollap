"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ToastProvider";

type Props = {
  productId: string;
};

export function BookmarkButton({ productId }: Props) {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" });
        if (!me.ok) {
          if (!cancelled) setIsAuthed(false);
          return;
        }
        if (!cancelled) setIsAuthed(true);

        const res = await fetch("/api/bookmarks", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { bookmarks: Array<{ productId: string }> };
        if (!cancelled) setIsBookmarked(payload.bookmarks.some((b) => b.productId === productId));
      } catch {
        // ignore
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const toggle = async () => {
    if (!isAuthed) {
      router.push(`/login?next=/course/${productId}`);
      return;
    }
    setIsBusy(true);
    try {
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "İşlem başarısız");
      }
      const payload = (await response.json()) as { bookmarked: boolean };
      setIsBookmarked(payload.bookmarked);
      showToast.success(
        payload.bookmarked ? "Kaydedildi" : "Kayıt kaldırıldı",
        payload.bookmarked
          ? "Kurs listene eklendi"
          : "Listenden kaldırıldı",
      );
    } catch (error) {
      showToast.error(
        "İşlem başarısız",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={isBusy}
      aria-pressed={isBookmarked}
      title={isBookmarked ? "Kayıtlardan çıkar" : "Daha sonra için kaydet"}
      className={`p-2.5 rounded-xl border transition-all ${
        isBookmarked
          ? "border-orange-500/40 bg-orange-500/15 text-orange-400 hover:bg-orange-500/20"
          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white hover:bg-white/[0.06] hover:border-white/25"
      }`}
    >
      <svg
        className="w-5 h-5"
        fill={isBookmarked ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );
}
