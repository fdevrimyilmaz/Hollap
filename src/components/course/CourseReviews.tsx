"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ToastProvider";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

type Summary = { total: number; average: number };

type Props = {
  productId: string;
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  return `${months} ay önce`;
}

function StarRow({
  value,
  size = "md",
  onSelect,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  onSelect?: (rating: number) => void;
}) {
  const dim = size === "lg" ? "w-6 h-6" : size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-0.5">
      {stars.map((star) => {
        const filled = star <= value;
        const Star = (
          <svg
            className={`${dim} ${filled ? "text-yellow-400" : "text-white/15"} transition-colors`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
        return onSelect ? (
          <button
            key={star}
            type="button"
            onClick={() => onSelect(star)}
            className="hover:scale-110 transition-transform"
            aria-label={`${star} yıldız`}
          >
            {Star}
          </button>
        ) : (
          <span key={star}>{Star}</span>
        );
      })}
    </div>
  );
}

export function CourseReviews({ productId }: Props) {
  const [summary, setSummary] = useState<Summary>({ total: 0, average: 0 });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load auth status
  useEffect(() => {
    let cancelled = false;
    const checkMe = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as { user?: { id: string } };
        if (!cancelled) setCurrentUserId(payload.user?.id ?? null);
      } catch {
        // ignore
      }
    };
    void checkMe();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(productId)}/reviews`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Yorumlar yüklenemedi");
      const payload = (await response.json()) as { summary: Summary; reviews: Review[] };
      setSummary(payload.summary);
      setReviews(payload.reviews);

      // If current user already reviewed, pre-fill form
      if (currentUserId) {
        const own = payload.reviews.find((review) => review.user.id === currentUserId);
        if (own) {
          setDraftRating(own.rating);
          setDraftComment(own.comment ?? "");
        }
      }
    } catch (error) {
      console.error("[reviews]", error);
    } finally {
      setIsLoading(false);
    }
  }, [productId, currentUserId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUserId) {
      showToast.warning("Giriş gerekli", "Yorum bırakmak için önce giriş yap");
      return;
    }
    if (draftRating < 1) {
      showToast.warning("Yıldız seç", "En az 1 yıldız vermen gerek");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(productId)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: draftRating, comment: draftComment.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Yorum gönderilemedi");
      }
      showToast.success("Teşekkürler!", "Yorumun kaydedildi");
      await loadReviews();
    } catch (error) {
      showToast.error(
        "Yorum gönderilemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteOwnReview = async () => {
    if (!confirm("Kendi yorumunu silmek istediğine emin misin?")) return;
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(productId)}/reviews`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Yorum silinemedi");
      setDraftRating(0);
      setDraftComment("");
      showToast.success("Yorum silindi", "Kaydın kaldırıldı");
      await loadReviews();
    } catch (error) {
      showToast.error(
        "Silinemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    }
  };

  const ownReview = currentUserId ? reviews.find((review) => review.user.id === currentUserId) : null;
  const otherReviews = reviews.filter((review) => review.user.id !== currentUserId);

  return (
    <div className="glass-card rounded-2xl p-6 lg:p-7">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-display font-semibold text-white tracking-tight">Yorumlar ve Puanlar</h2>
      </div>

      <div className="flex items-center gap-5 mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/5">
        <div className="text-center shrink-0">
          <p className="text-4xl font-display font-bold text-white tabular-nums">{summary.average.toFixed(1)}</p>
          <StarRow value={Math.round(summary.average)} size="sm" />
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">{summary.total} değerlendirme</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">
            {summary.total > 0
              ? `${reviews.length} kişi bu içeriği değerlendirdi`
              : "İlk değerlendirmeyi sen yap"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Yıldız + kısa bir yorum, diğer öğrencilere yön gösterir.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="mb-6 p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-sm font-medium text-white">
            {ownReview ? "Değerlendirmeni güncelle" : "Değerlendirme bırak"}
          </label>
          <StarRow value={draftRating} size="lg" onSelect={setDraftRating} />
        </div>
        <Textarea
          value={draftComment}
          onChange={(event) => setDraftComment(event.target.value)}
          placeholder="Kursla ilgili düşüncelerini paylaş (opsiyonel)…"
          className="bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl min-h-[80px] resize-y"
        />
        <div className="flex justify-between items-center gap-2">
          {ownReview ? (
            <button
              type="button"
              onClick={() => void deleteOwnReview()}
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
            >
              Yorumumu sil
            </button>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            disabled={isSubmitting || draftRating < 1}
            className="gradient-bg text-white border-0 shadow-md shadow-orange-500/25 font-medium disabled:opacity-50"
          >
            {isSubmitting ? "Kaydediliyor…" : ownReview ? "Güncelle" : "Gönder"}
          </Button>
        </div>
      </form>

      {/* Review list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl shimmer" />
          ))
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Henüz yorum yok.</div>
        ) : (
          <>
            {ownReview && (
              <ReviewCard review={ownReview} highlight />
            )}
            {otherReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review, highlight }: { review: Review; highlight?: boolean }) {
  return (
    <article
      className={`rounded-xl p-4 border ${
        highlight
          ? "bg-orange-500/[0.06] border-orange-500/30"
          : "bg-white/[0.04] border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-9 h-9 shrink-0">
            {review.user.avatarUrl ? <AvatarImage src={review.user.avatarUrl} alt={review.user.name} /> : null}
            <AvatarFallback className="bg-white/10 text-xs font-semibold">
              {initialsOf(review.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white truncate">{review.user.name}</p>
              {highlight && (
                <span className="text-[10px] uppercase tracking-wider text-orange-400 font-semibold">
                  Senin yorumun
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{relativeTime(review.createdAt)}</p>
          </div>
        </div>
        <StarRow value={review.rating} size="sm" />
      </div>
      {review.comment && (
        <p className="text-sm text-muted-foreground leading-relaxed pl-12">{review.comment}</p>
      )}
    </article>
  );
}
