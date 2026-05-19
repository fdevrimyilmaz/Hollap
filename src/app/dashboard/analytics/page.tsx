"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TIER_COLORS, TIER_LABELS } from "@/components/dashboard/AnalyticsCharts";
import type {
  DailySalesPoint,
  SubscriptionMix,
  TopProduct,
} from "@/components/dashboard/AnalyticsCharts";

const ChartSkeleton = ({ height = 240 }: { height?: number }) => (
  <div
    className="w-full rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center"
    style={{ height }}
  >
    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-orange-500" />
  </div>
);

const DailyRevenueChart = dynamic(
  () => import("@/components/dashboard/AnalyticsCharts").then((m) => m.DailyRevenueChart),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
);

const TopProductsChart = dynamic(
  () => import("@/components/dashboard/AnalyticsCharts").then((m) => m.TopProductsChart),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> },
);

const SubscriptionMixChart = dynamic(
  () => import("@/components/dashboard/AnalyticsCharts").then((m) => m.SubscriptionMixChart),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> },
);

type AuthUser = {
  name: string;
  role: "creator" | "subscriber";
};

type AnalyticsPayload = {
  windowDays: number;
  summary: {
    salesCount: number;
    grossCents: number;
    netCents: number;
    commissionCents: number;
    newSubscribers: number;
  };
  dailySales: DailySalesPoint[];
  topProducts: TopProduct[];
  subscriptionMix: SubscriptionMix[];
};

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function DashboardAnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/analytics", { cache: "no-store" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (response.status === 403) {
        router.push("/dashboard");
        return;
      }
      if (!response.ok) throw new Error("Analitik yüklenemedi");
      const payload = (await response.json()) as AnalyticsPayload;
      setAnalytics(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          router.push("/login");
          return;
        }
        const payload = (await response.json()) as { user?: AuthUser };
        if (!payload.user) {
          router.push("/login");
          return;
        }
        if (payload.user.role !== "creator") {
          router.push("/dashboard");
          return;
        }
        setUser(payload.user);
        await loadAnalytics();
      } catch {
        router.push("/login");
      }
    };
    void load();
  }, [router, loadAnalytics]);

  if (!user || (isLoading && !analytics)) {
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
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Analizler</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Son <span className="text-white font-semibold tabular-nums">{analytics?.windowDays ?? 30}</span> günün performans özeti.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
            <Link href="/dashboard">← Panele Dön</Link>
          </Button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
            {error}
          </div>
        ) : analytics ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Satış" value={String(analytics.summary.salesCount)} hint="Son 30 gün" />
              <SummaryCard label="Brüt Gelir" value={formatUsd(analytics.summary.grossCents)} hint="Komisyon dahil" />
              <SummaryCard label="Net Kazanç" value={formatUsd(analytics.summary.netCents)} hint="%80 sana kalan" highlight />
              <SummaryCard label="Yeni Abone" value={String(analytics.summary.newSubscribers)} hint="Son 30 gün" />
            </div>

            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-base">Günlük Gelir (30 gün)</CardTitle>
              </CardHeader>
              <CardContent>
                <DailyRevenueChart data={analytics.dailySales} />
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="glass-card border-white/10 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white text-base">En İyi Ürünler</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.topProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Henüz satış yok.</p>
                  ) : (
                    <TopProductsChart data={analytics.topProducts} />
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-base">Abone Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.subscriptionMix.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Henüz aboneliğin yok.</p>
                  ) : (
                    <>
                      <SubscriptionMixChart data={analytics.subscriptionMix} />
                      <div className="space-y-1.5 mt-2">
                        {analytics.subscriptionMix.map((entry) => (
                          <div key={entry.tier} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ background: TIER_COLORS[entry.tier] ?? "#6b7280" }}
                              />
                              <span className="text-muted-foreground">{TIER_LABELS[entry.tier] ?? entry.tier}</span>
                            </div>
                            <span className="text-white tabular-nums font-medium">{entry.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`glass-card ${highlight ? "border-orange-500/40 shadow-lg shadow-orange-500/10" : "border-white/10"}`}>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className={`text-3xl font-display font-bold mt-1.5 tabular-nums ${highlight ? "gradient-text" : "text-white"}`}>
          {value}
        </p>
        {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
        {highlight && (
          <Badge className="mt-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium text-[10px]">
            Net
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
