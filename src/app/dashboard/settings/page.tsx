"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuthUser = {
  name: string;
  role: "creator" | "subscriber";
};

export default function DashboardSettingsPage() {
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
            <h1 className="text-3xl font-bold text-white">Ayarlar</h1>
            <p className="text-sm text-muted-foreground">
              Hesap ayarlari ve guvenlik islemleri.
            </p>
          </div>
          <Button asChild variant="outline" className="border-white/10">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Hesap Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-white">Kullanici: {user.name}</p>
              <p className="text-sm text-muted-foreground">Rol: {user.role}</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Sifre ve Guvenlik</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sifrenizi degistirmek icin sifirlama adimini kullanabilirsiniz.
              </p>
              <Button asChild size="sm" className="gradient-bg text-white border-0">
                <Link href="/forgot-password">Sifreyi Yenile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
