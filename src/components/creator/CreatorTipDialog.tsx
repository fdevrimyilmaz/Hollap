"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/ToastProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const PRESET_AMOUNTS_CENTS = [300, 500, 1000, 2500] as const;

function parseCustomAmountToCents(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const dollars = Number(normalized);
  if (!Number.isFinite(dollars) || dollars <= 0) {
    return null;
  }

  const cents = Math.round(dollars * 100);
  return Number.isFinite(cents) ? cents : null;
}

type CreatorTipDialogProps = {
  creatorId: string;
  creatorName: string;
};

export function CreatorTipDialog({ creatorId, creatorName }: CreatorTipDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPresetCents, setSelectedPresetCents] = useState<number>(PRESET_AMOUNTS_CENTS[1]);
  const [customAmount, setCustomAmount] = useState("");
  const idempotencyKeyRef = useRef(`tip_${crypto.randomUUID()}`);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tipStatus = params.get("tip");

    if (tipStatus === "success") {
      showToast.success("Bahsis gonderildi", `${creatorName} icin odemeniz basariyla alindi.`);
    } else if (tipStatus === "cancelled") {
      showToast.info("Bahsis iptal edildi", "Isterseniz daha sonra tekrar deneyebilirsiniz.");
    }

    if (!tipStatus) {
      return;
    }

    params.delete("tip");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [creatorName]);

  const customAmountCents = useMemo(
    () => parseCustomAmountToCents(customAmount),
    [customAmount]
  );

  const amountCents = customAmount.trim().length > 0 ? customAmountCents : selectedPresetCents;
  const amountLabel = amountCents ? `$${(amountCents / 100).toFixed(2)}` : "-";

  const handleTip = async () => {
    if (!amountCents || amountCents < 100 || amountCents > 1_000_000) {
      showToast.warning("Gecerli tutar girin", "Bahsis tutari $1.00 ile $10,000.00 arasinda olmali.");
      return;
    }

    setIsProcessing(true);

    try {
      const currentPath = window.location.pathname;
      const response = await fetch("/api/payments/tips/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          creatorId,
          amountCents,
          successPath: `${currentPath}?tip=success`,
          cancelPath: `${currentPath}?tip=cancelled`,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        showToast.warning("Giris gerekli", "Bahsis gondermek icin once hesabiniza giris yapin.");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Bahsis checkout baslatilamadi");
      }

      const payload = (await response.json()) as { checkoutUrl?: string };
      if (!payload.checkoutUrl) {
        throw new Error("Stripe checkout URL donmedi");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      showToast.error(
        "Bahsis gonderilemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata"
      );
    } finally {
      setIsProcessing(false);
      idempotencyKeyRef.current = `tip_${crypto.randomUUID()}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
          Bahsis Gonder
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-background/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle>{creatorName} icin bahsis gonder</DialogTitle>
          <DialogDescription>
            Dilersen hazir tutarlardan sec veya kendi tutarini gir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PRESET_AMOUNTS_CENTS.map((presetAmount) => (
              <Button
                key={presetAmount}
                type="button"
                variant={selectedPresetCents === presetAmount && customAmount.trim().length === 0 ? "default" : "outline"}
                className={selectedPresetCents === presetAmount && customAmount.trim().length === 0 ? "gradient-bg border-0 text-white" : "border-white/20"}
                onClick={() => {
                  setCustomAmount("");
                  setSelectedPresetCents(presetAmount);
                }}
                disabled={isProcessing}
              >
                ${ (presetAmount / 100).toFixed(2) }
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="custom-tip" className="text-sm text-muted-foreground">
              Ozel tutar (USD)
            </label>
            <Input
              id="custom-tip"
              inputMode="decimal"
              placeholder="Ornek: 7.50"
              value={customAmount}
              onChange={(event) => setCustomAmount(event.target.value)}
              disabled={isProcessing}
              className="border-white/10 bg-white/5"
            />
          </div>

          <div className="rounded-lg bg-white/5 p-3 text-sm">
            <span className="text-muted-foreground">Toplam bahsis: </span>
            <span className="font-semibold text-white">{amountLabel}</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => void handleTip()}
            disabled={isProcessing || !amountCents}
            className="gradient-bg border-0 text-white"
          >
            {isProcessing ? "Yonlendiriliyor..." : `${amountLabel} ile devam et`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
