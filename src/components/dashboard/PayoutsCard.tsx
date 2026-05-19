"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/components/ToastProvider";

type PayoutStatus = {
  configured: boolean;
  accountId: string | null;
  payoutsEnabled: boolean;
  country: string | null;
};

export function PayoutsCard() {
  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/dashboard/stripe-connect", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as PayoutStatus;
        if (!cancelled) setStatus(payload);
      } catch {
        // ignore
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = async () => {
    setIsBusy(true);
    try {
      const response = await fetch("/api/dashboard/stripe-connect", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        accountId?: string;
        onboardingUrl?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Stripe bağlantısı başarısız");
      }

      if (!payload.onboardingUrl) {
        throw new Error("Stripe onboarding URL alınamadı");
      }

      window.location.href = payload.onboardingUrl;
    } catch (error) {
      showToast.error(
        "Stripe bağlanamadı",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsBusy(false);
    }
  };

  if (!status) {
    return (
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Ödeme Hesabı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-12 rounded-xl shimmer" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = Boolean(status.accountId);
  const isReady = status.payoutsEnabled;

  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-white">Ödeme Hesabı</CardTitle>
        {isReady ? (
          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
            ✓ Hazır
          </Badge>
        ) : isConnected ? (
          <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
            Eksik bilgi
          </Badge>
        ) : (
          <Badge variant="outline" className="border-white/15 bg-white/[0.02] text-muted-foreground">
            Bağlanmadı
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isReady ? (
          <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4 space-y-2">
            <p className="text-sm text-white font-medium">Stripe Express hesabın aktif</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Satışlarından kazanç net olarak banka hesabına aktarılır.
              {status.accountId && (
                <span className="block mt-1 font-mono text-[10px] text-muted-foreground/70">
                  {status.accountId}
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ödeme almak için Stripe Express hesabını bağla. Banka bilgilerin ve KYC doğrulaman Stripe&apos;ta tutulur.
            </p>
            {!status.configured && (
              <div className="rounded-lg bg-amber-500/[0.08] border border-amber-500/30 p-3">
                <p className="text-xs text-amber-200 leading-relaxed">
                  <strong className="font-semibold">Stripe henüz yapılandırılmamış.</strong> Platform yöneticisi STRIPE_SECRET_KEY ayarlayana kadar ödeme alamazsın.
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={() => void connect()}
          disabled={isBusy || !status.configured}
          className={isReady
            ? "border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 font-medium"
            : "gradient-bg text-white border-0 shadow-md shadow-orange-500/25 font-medium disabled:opacity-50 disabled:cursor-not-allowed"}
          variant={isReady ? "outline" : "default"}
        >
          {isBusy
            ? "Açılıyor…"
            : !status.configured
              ? "Stripe yapılandırılmamış"
              : isReady
                ? "Hesabı Düzenle"
                : isConnected
                  ? "Onboarding'i Tamamla"
                  : "Stripe'a Bağlan"}
        </Button>
      </CardContent>
    </Card>
  );
}
