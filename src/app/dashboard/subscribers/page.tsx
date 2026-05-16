"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuthUser = {
  name: string;
  role: "creator" | "subscriber";
};

export default function DashboardSubscribersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
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
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [router]);

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">Aboneler</h1>
            <p className="text-sm text-muted-foreground">
              {user.name} icin abone yonetimi ve segmentleme alani.
            </p>
          </div>
          <Button asChild variant="outline" className="border-white/10">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Abone Segmentleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div>
                <p className="text-sm text-white">Tum Aboneler</p>
                <p className="text-xs text-muted-foreground">Toplu duyuru ve dosya gonderimi.</p>
              </div>
              <Badge variant="outline" className="border-white/10">
                Hazir
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div>
                <p className="text-sm text-white">VIP Aboneler</p>
                <p className="text-xs text-muted-foreground">Premium icerik alicilari.</p>
              </div>
              <Badge variant="outline" className="border-white/10">
                Yakinda
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div>
                <p className="text-sm text-white">Yeni Aboneler</p>
                <p className="text-xs text-muted-foreground">Son kaydolan kullanicilar.</p>
              </div>
              <Badge variant="outline" className="border-white/10">
                Yakinda
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
