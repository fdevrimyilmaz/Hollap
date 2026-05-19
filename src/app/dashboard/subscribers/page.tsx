"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuthUser = {
  name: string;
  role: "creator" | "subscriber";
};

type Subscriber = {
  id: string;
  tier: "free" | "supporter" | "vip" | string;
  status: string | null;
  active: boolean;
  since: string;
  periodEnd: string | null;
  subscriber: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

type SubscribersPayload = {
  counts: {
    total: number;
    active: number;
    vip: number;
    supporter: number;
    free: number;
    newLast30Days: number;
  };
  subscribers: Subscriber[];
};

const TIER_META: Record<string, { label: string; classes: string }> = {
  free: { label: "Ücretsiz", classes: "border-white/15 bg-white/[0.04] text-white/70" },
  supporter: { label: "Destekçi", classes: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
  vip: { label: "VIP", classes: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
};

type SegmentFilter = "all" | "active" | "vip" | "supporter" | "free" | "new";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function DashboardSubscribersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<SubscribersPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SegmentFilter>("active");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        const me = (await meRes.json()) as { user?: AuthUser };
        if (!me.user) {
          router.push("/login");
          return;
        }
        if (me.user.role !== "creator") {
          router.push("/dashboard");
          return;
        }
        setUser(me.user);

        const subsRes = await fetch("/api/dashboard/subscribers", { cache: "no-store" });
        if (!subsRes.ok) {
          throw new Error("Aboneler yüklenemedi");
        }
        const payload = (await subsRes.json()) as SubscribersPayload;
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [router]);

  const visible = useMemo(() => {
    if (!data) return [];
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let list = data.subscribers;

    if (filter === "active") list = list.filter((s) => s.active);
    if (filter === "vip") list = list.filter((s) => s.active && s.tier === "vip");
    if (filter === "supporter") list = list.filter((s) => s.active && s.tier === "supporter");
    if (filter === "free") list = list.filter((s) => s.active && s.tier === "free");
    if (filter === "new") {
      list = list.filter((s) => s.active && new Date(s.since).getTime() >= thirtyDaysAgo);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.subscriber.name.toLowerCase().includes(q) ||
          s.subscriber.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, filter, search]);

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </main>
    );
  }

  const counts = data?.counts;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Aboneler</h1>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-white font-medium">{user.name}</span> için abone yönetimi.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
            <Link href="/dashboard">← Panele Dön</Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {counts && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CountCard label="Aktif abone" value={counts.active} sub={`Toplam ${counts.total}`} highlight />
            <CountCard label="VIP" value={counts.vip} sub="Premium" />
            <CountCard label="Destekçi" value={counts.supporter} sub="Ücretli" />
            <CountCard label="Son 30 gün" value={counts.newLast30Days} sub="Yeni katılan" />
          </div>
        )}

        <Card className="glass-card border-white/10">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-white text-base">Abone Listesi</CardTitle>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="İsim veya e-posta ara…"
                className="h-9 w-56 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-muted-foreground/70 focus:outline-none focus:border-white/25"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["active", "Aktif"],
                  ["all", "Tümü"],
                  ["vip", "VIP"],
                  ["supporter", "Destekçi"],
                  ["free", "Ücretsiz"],
                  ["new", "Yeni (30g)"],
                ] as Array<[SegmentFilter, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filter === key
                      ? "border-orange-500/40 bg-orange-500/15 text-orange-200"
                      : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-white hover:border-white/25"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                {data && data.subscribers.length === 0
                  ? "Henüz abone yok. Profilini paylaşarak ilk abonelerini kazan."
                  : "Bu segmentte abone bulunamadı."}
              </p>
            ) : (
              <div className="space-y-2">
                {visible.map((sub) => {
                  const tierMeta = TIER_META[sub.tier] ?? TIER_META.free;
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 hover:border-white/15 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-500/30 border border-white/10 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                          {sub.subscriber.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={sub.subscriber.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            sub.subscriber.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{sub.subscriber.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{sub.subscriber.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-[11px] text-muted-foreground">Katılım</p>
                          <p className="text-xs text-white tabular-nums">{formatDate(sub.since)}</p>
                        </div>
                        <Badge variant="outline" className={tierMeta.classes}>
                          {tierMeta.label}
                        </Badge>
                        {!sub.active && (
                          <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-300">
                            Sona erdi
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function CountCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`glass-card ${highlight ? "border-orange-500/40 shadow-lg shadow-orange-500/10" : "border-white/10"}`}>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className={`text-2xl font-display font-bold mt-1 tabular-nums ${highlight ? "gradient-text" : "text-white"}`}>
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
