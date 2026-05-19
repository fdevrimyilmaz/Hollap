"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "ok" | "degraded" | "down";

export function SystemStatus() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        if (cancelled) return;
        if (!response.ok) {
          setStatus("down");
          return;
        }
        const payload = (await response.json()) as { ok?: boolean; db?: string };
        if (cancelled) return;
        setStatus(payload.ok && payload.db === "ok" ? "ok" : "degraded");
      } catch {
        if (!cancelled) setStatus("down");
      } finally {
        if (!cancelled) {
          timer = setTimeout(check, 60_000);
        }
      }
    };

    void check();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const config = {
    loading: { dot: "bg-white/30", label: "Sistem kontrol ediliyor…" },
    ok: { dot: "bg-emerald-500", label: "Tüm sistemler çalışıyor" },
    degraded: { dot: "bg-amber-500", label: "Kısmi kesinti" },
    down: { dot: "bg-red-500", label: "Hizmet kullanılamıyor" },
  }[status];

  return (
    <span className="flex items-center gap-2">
      <span className="relative flex w-1.5 h-1.5">
        {status === "ok" && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50 animate-ping" />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`} />
      </span>
      {config.label}
    </span>
  );
}
