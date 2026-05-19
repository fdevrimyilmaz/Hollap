"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ToastProvider";

type Tier = "free" | "supporter" | "vip";

type SubscribeButtonProps = {
  creatorId: string;
  creatorName: string;
  priceLabel: string;
  tier?: Tier;
  /** When true, renders compact button suitable for the top profile bar. */
  compact?: boolean;
  /** Optional override label (e.g. "Abone Ol — $5/ay") */
  label?: string;
  /** Visual variant: filled (primary) vs outline */
  variant?: "default" | "outline";
};

type StatusPayload = {
  subscribed: boolean;
  tier?: Tier;
  status?: string | null;
  since?: string | null;
};

export function SubscribeButton({
  creatorId,
  creatorName,
  priceLabel,
  tier = "supporter",
  compact = false,
  label,
  variant = "default",
}: SubscribeButtonProps) {
  const router = useRouter();
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [activeTier, setActiveTier] = useState<Tier | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Check session
        const me = await fetch("/api/auth/me", { cache: "no-store" });
        if (!me.ok) {
          if (!cancelled) {
            setIsAuthed(false);
            setIsLoadingStatus(false);
          }
          return;
        }
        if (!cancelled) setIsAuthed(true);

        // Check subscription
        const response = await fetch(`/api/creators/${creatorId}/subscribe`, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setIsLoadingStatus(false);
          return;
        }
        const payload = (await response.json()) as StatusPayload;
        if (!cancelled) {
          setIsSubscribed(payload.subscribed);
          setActiveTier(payload.tier ?? null);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoadingStatus(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [creatorId]);

  const subscribe = async () => {
    if (!isAuthed) {
      router.push(`/login?next=/creator/${creatorId}`);
      return;
    }
    setIsBusy(true);
    try {
      const response = await fetch(`/api/creators/${creatorId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        subscribed?: boolean;
        pending?: boolean;
        checkoutUrl?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Abonelik başarısız");
      }

      // Paid tier flow: Stripe Checkout redirect.
      if (payload.checkoutUrl) {
        window.location.href = payload.checkoutUrl;
        return;
      }

      // Free tier: immediate activation.
      setIsSubscribed(true);
      setActiveTier(tier);
      showToast.success(
        "Abone oldun",
        `${creatorName} içerikleri için bildirim alacaksın`,
      );
      router.refresh();
    } catch (error) {
      showToast.error(
        "Abonelik başarısız",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const unsubscribe = async () => {
    if (!confirm(`${creatorName} aboneliğinden çıkmak istediğine emin misin?`)) return;
    setIsBusy(true);
    try {
      const response = await fetch(`/api/creators/${creatorId}/subscribe`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Abonelik iptal edilemedi");
      setIsSubscribed(false);
      setActiveTier(null);
      showToast.success("Abonelik iptal edildi", "Tekrar abone olabilirsin");
      router.refresh();
    } catch (error) {
      showToast.error(
        "İptal başarısız",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const showAsSubscribed = isSubscribed && (!tier || activeTier === tier || tier === "supporter");

  if (isLoadingStatus) {
    return (
      <Button
        size={compact ? "default" : "lg"}
        disabled
        variant={variant}
        className={compact ? "h-10 px-4 opacity-60" : "h-12 px-5 opacity-60"}
      >
        <span className="animate-pulse">…</span>
      </Button>
    );
  }

  if (showAsSubscribed) {
    return (
      <Button
        size={compact ? "default" : "lg"}
        variant="outline"
        onClick={() => void unsubscribe()}
        disabled={isBusy}
        className={compact
          ? "h-10 px-4 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40 transition-colors group font-medium"
          : "h-12 px-5 border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40 transition-colors group font-medium flex-1 md:flex-none"}
      >
        <span className="group-hover:hidden flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Abone
        </span>
        <span className="hidden group-hover:inline">Aboneliği İptal Et</span>
      </Button>
    );
  }

  const buttonLabel = label ?? `Abone Ol — ${priceLabel}`;

  return (
    <Button
      size={compact ? "default" : "lg"}
      onClick={() => void subscribe()}
      disabled={isBusy}
      className={`${variant === "outline"
        ? "border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25"
        : "gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/30"
      } ${compact ? "h-10 px-4 font-medium" : "h-12 px-5 font-medium flex-1 md:flex-none"}`}
    >
      {isBusy ? "İşleniyor…" : buttonLabel}
    </Button>
  );
}
