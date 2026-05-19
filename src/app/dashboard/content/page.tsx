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

type DashboardProduct = {
  id: string;
  name: string;
  amountCents: number;
  stock: number;
  sold: number;
  isActive: boolean;
  thumbnailUrl: string | null;
  createdAt?: string;
};

type DashboardData = {
  products: DashboardProduct[];
};

type StatusFilter = "all" | "active" | "draft" | "sold-out";

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function DashboardContentPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");

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

        const dashRes = await fetch("/api/dashboard", { cache: "no-store" });
        if (!dashRes.ok) {
          throw new Error("İçerikler yüklenemedi");
        }
        const payload = (await dashRes.json()) as DashboardData;
        setProducts(payload.products ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [router]);

  const filtered = useMemo(() => {
    if (filter === "active") return products.filter((p) => p.isActive && p.stock > 0);
    if (filter === "draft") return products.filter((p) => !p.isActive);
    if (filter === "sold-out") return products.filter((p) => p.isActive && p.stock === 0);
    return products;
  }, [filter, products]);

  const counts = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.isActive && p.stock > 0).length,
      draft: products.filter((p) => !p.isActive).length,
      soldOut: products.filter((p) => p.isActive && p.stock === 0).length,
      totalSold: products.reduce((acc, p) => acc + (p.sold ?? 0), 0),
    }),
    [products],
  );

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">İçeriklerim</h1>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-white font-medium">{user.name}</span> için yayın yönetimi.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
              <Link href="/dashboard">← Panele Dön</Link>
            </Button>
            <Button asChild size="sm" className="gradient-bg text-white border-0 font-medium shadow-md shadow-orange-500/25">
              <Link href="/new">Yeni İçerik</Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CountCard label="Toplam" value={counts.total} sub="Tüm içerikler" />
          <CountCard label="Yayında" value={counts.active} sub="Satışta" highlight />
          <CountCard label="Taslak" value={counts.draft} sub="Pasif" />
          <CountCard label="Toplam satış" value={counts.totalSold} sub="Adet" />
        </div>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">İçerikler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "Tümü"],
                  ["active", "Yayında"],
                  ["draft", "Taslak"],
                  ["sold-out", "Tükendi"],
                ] as Array<[StatusFilter, string]>
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

            {filtered.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {products.length === 0
                    ? "Henüz içerik eklemedin. İlk ürününü oluştur."
                    : "Bu segmentte içerik yok."}
                </p>
                {products.length === 0 && (
                  <Button asChild className="gradient-bg text-white border-0">
                    <Link href="/new">İlk içeriği oluştur</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {filtered.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 hover:border-white/15 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-white/10 shrink-0">
                      {product.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{product.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="tabular-nums">{formatUsd(product.amountCents)}</span>
                        <span>·</span>
                        <span className="tabular-nums">{product.sold} satıldı</span>
                        <span>·</span>
                        <span className="tabular-nums">Stok: {product.stock}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!product.isActive ? (
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                          Taslak
                        </Badge>
                      ) : product.stock === 0 ? (
                        <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-300">
                          Tükendi
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          Yayında
                        </Badge>
                      )}
                      <Button asChild size="sm" variant="outline" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 text-xs h-8">
                        <Link href={`/dashboard/lessons?product=${product.id}`}>Düzenle</Link>
                      </Button>
                    </div>
                  </div>
                ))}
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
