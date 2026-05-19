"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ToastProvider";

type PushSupport = "checking" | "unsupported" | "denied" | "default" | "granted";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export function PushNotificationToggle() {
  const [status, setStatus] = useState<PushSupport>("checking");
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const detectSupport = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    // Server-side push enabled?
    try {
      const response = await fetch("/api/push/vapid-key", { cache: "no-store" });
      const payload = (await response.json()) as { publicKey: string | null; enabled: boolean };
      setServerEnabled(payload.enabled);
      setVapidKey(payload.publicKey);
    } catch {
      setServerEnabled(false);
    }

    const permission = Notification.permission as PushSupport;
    setStatus(permission);

    // Current subscription state
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await registration?.pushManager.getSubscription();
      setIsSubscribed(Boolean(sub));
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    void detectSupport();
  }, [detectSupport]);

  const subscribe = async () => {
    if (!vapidKey) {
      showToast.error("Push devre dışı", "Sunucuda VAPID anahtarları yok");
      return;
    }
    setIsBusy(true);
    try {
      const registration =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ||
        (await navigator.serviceWorker.register("/sw.js"));

      const permission = await Notification.requestPermission();
      setStatus(permission as PushSupport);
      if (permission !== "granted") {
        showToast.warning("İzin reddedildi", "Bildirim göndermek için tarayıcı izni gerek");
        return;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const payload = sub.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: payload.endpoint,
          keys: payload.keys,
        }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Sunucu kaydı başarısız");
      }

      setIsSubscribed(true);
      showToast.success("Bildirimler açık", "Artık push bildirimleri alacaksın");
    } catch (error) {
      showToast.error(
        "Bildirimler açılamadı",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const unsubscribe = async () => {
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      showToast.success("Bildirimler kapatıldı", "Yeni bildirim gönderilmeyecek");
    } catch (error) {
      showToast.error(
        "İşlem başarısız",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsBusy(false);
    }
  };

  if (status === "checking" || serverEnabled === null) {
    return (
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Tarayıcı push bildirimleri</p>
          <p className="text-xs text-muted-foreground mt-1">Kontrol ediliyor…</p>
        </div>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 opacity-70">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Tarayıcı push bildirimleri</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Tarayıcın push bildirimlerini desteklemiyor.
          </p>
        </div>
      </div>
    );
  }

  if (!serverEnabled) {
    return (
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 opacity-70">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">Tarayıcı push bildirimleri</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Sunucuda push devre dışı (WEB_PUSH_PUBLIC_KEY / WEB_PUSH_PRIVATE_KEY ayarlanmalı).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">Tarayıcı push bildirimleri</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {isSubscribed
            ? "Yeni etkinlikler bu cihaza anında bildirim olarak gelecek."
            : "Açarsan yeni satış, yorum ve canlı yayınları kaçırmazsın."}
        </p>
        {status === "denied" && (
          <p className="text-xs text-amber-400 mt-1.5">
            Tarayıcı izni reddedildi. Site ayarlarından el ile açman gerek.
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant={isSubscribed ? "outline" : "default"}
        onClick={() => void (isSubscribed ? unsubscribe() : subscribe())}
        disabled={isBusy || status === "denied"}
        className={isSubscribed
          ? "border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 shrink-0 font-medium"
          : "gradient-bg text-white border-0 shrink-0 font-medium"}
      >
        {isBusy ? "…" : isSubscribed ? "Kapat" : "Aç"}
      </Button>
    </div>
  );
}
