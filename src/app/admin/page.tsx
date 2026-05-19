"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/components/ToastProvider";

type Overview = {
  stats: {
    total_users: number;
    creators: number;
    subscribers: number;
    active_products: number;
    sales_count: number;
    gross_cents: number;
  };
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: "admin" | "creator" | "subscriber";
    verified: boolean;
    createdAt: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    creatorName: string;
    priceCents: number;
    sold: number;
    isActive: boolean;
    createdAt: string;
  }>;
  recentSales: Array<{
    id: string;
    amountCents: number;
    source: string | null;
    buyer: string | null;
    creator: string | null;
    product: string | null;
    createdAt: string;
  }>;
};

const roleColors: Record<string, string> = {
  admin: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  creator: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  subscriber: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const roleLabels: Record<string, string> = {
  admin: "Yönetici",
  creator: "Yaratıcı",
  subscriber: "Öğrenci",
};

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(iso),
    );
  } catch {
    return iso.slice(0, 10);
  }
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/login?next=/admin");
        return;
      }
      if (response.status === 403) {
        setError("Bu sayfaya yalnızca yöneticiler erişebilir.");
        return;
      }
      if (!response.ok) {
        setError("Yönetim verisi yüklenemedi");
        return;
      }
      const payload = (await response.json()) as Overview;
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = async (userId: string, role: "admin" | "creator" | "subscriber") => {
    setBusyUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Rol güncellenemedi");
      }
      showToast.success("Rol güncellendi", `Yeni rol: ${roleLabels[role]}`);
      await load();
    } catch (err) {
      showToast.error(
        "İşlem başarısız",
        err instanceof Error ? err.message : "Bilinmeyen hata",
      );
    } finally {
      setBusyUserId(null);
    }
  };

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center glass-card rounded-2xl p-8">
          <h1 className="text-xl font-display font-bold text-white mb-2">Erişim engellendi</h1>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button asChild className="gradient-bg text-white border-0">
            <Link href="/dashboard">Panele Dön</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Yönetim Paneli</h1>
            <p className="text-sm text-muted-foreground mt-1">Platform genelinde kullanıcı, ürün ve satış yönetimi.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
            <Link href="/dashboard">← Panele Dön</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Toplam Kullanıcı" value={String(data.stats.total_users)} />
          <StatCard label="Yaratıcı" value={String(data.stats.creators)} />
          <StatCard label="Aktif Ürün" value={String(data.stats.active_products)} />
          <StatCard label="Brüt Satış" value={formatUsd(data.stats.gross_cents)} highlight />
        </div>

        {/* Users */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Son Kullanıcılar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentUsers.map((u) => (
                <div key={u.id} className="rounded-xl bg-white/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-white truncate">{u.name}</p>
                      {u.verified && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-500/5 text-emerald-400">
                          Doğrulanmış
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge className={`${roleColors[u.role]} border font-medium shrink-0`}>
                    {roleLabels[u.role]}
                  </Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    {(["subscriber", "creator", "admin"] as const).map((role) =>
                      role === u.role ? null : (
                        <button
                          key={role}
                          type="button"
                          onClick={() => void changeRole(u.id, role)}
                          disabled={busyUserId === u.id}
                          className="px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                          title={`${roleLabels[role]} yap`}
                        >
                          → {roleLabels[role]}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ))}
              {data.recentUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Kullanıcı yok.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products + Sales side-by-side */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Son Ürünler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.products.map((p) => (
                  <div key={p.id} className="rounded-xl bg-white/5 p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.creatorName} · {formatDate(p.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-display font-bold text-white tabular-nums">{formatUsd(p.priceCents)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{p.sold} satış</p>
                    </div>
                  </div>
                ))}
                {data.products.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Ürün yok.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Son Satışlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentSales.map((s) => (
                  <div key={s.id} className="rounded-xl bg-white/5 p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{s.product ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.buyer ?? "—"} → {s.creator ?? "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-display font-bold text-white tabular-nums">{formatUsd(s.amountCents)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {data.recentSales.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Satış kaydı yok.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`glass-card ${highlight ? "border-orange-500/40 shadow-lg shadow-orange-500/10" : "border-white/10"}`}>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className={`text-2xl font-display font-bold mt-1.5 tabular-nums ${highlight ? "gradient-text" : "text-white"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
