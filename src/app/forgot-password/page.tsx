"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ToastProvider";

export default function ForgotPasswordPage() {
  const [token, setToken] = useState("");
  const resetMode = useMemo(() => token.length > 0, [token]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token")?.trim() ?? "");
  }, []);

  const onRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { message?: string };

      showToast.success(
        "Sifirlama talebi alindi",
        payload.message ?? "E-posta adresine sifre sifirlama baglantisi gonderildi"
      );

      setEmail("");
    } catch {
      showToast.success(
        "Sifirlama talebi alindi",
        "Eger e-posta sistemde kayitliysa sifirlama baglantisi gonderilir"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResetPassword = async (event: FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      showToast.error("Sifreler uyusmuyor", "Lutfen sifreleri tekrar kontrol edin");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Sifre guncellenemedi");
      }

      showToast.success("Sifre guncellendi", "Yeni sifrenizle giris yapabilirsiniz");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      showToast.error(
        "Sifre guncellenemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[150px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {resetMode ? "Yeni Sifre Belirle" : "Sifremi Unuttum"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {resetMode
              ? "Guvenli bir sifre belirleyin. Islem sonunda tum aktif oturumlar kapatilir."
              : "Kayitli e-posta adresini girin. Sifre sifirlama baglantisi gonderelim."}
          </p>

          {!resetMode ? (
            <form onSubmit={onRequestReset} className="space-y-4">
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@email.com"
                className="h-12 bg-white/5 border-white/10"
                required
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 gradient-bg hover:opacity-90 text-white border-0"
              >
                {isSubmitting ? "Gonderiliyor..." : "Sifirlama Baglantisi Gonder"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onResetPassword} className="space-y-4">
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Yeni sifre"
                className="h-12 bg-white/5 border-white/10"
                required
                minLength={8}
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Yeni sifre (tekrar)"
                className="h-12 bg-white/5 border-white/10"
                required
                minLength={8}
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 gradient-bg hover:opacity-90 text-white border-0"
              >
                {isSubmitting ? "Guncelleniyor..." : "Sifreyi Guncelle"}
              </Button>
            </form>
          )}

          <p className="text-sm text-muted-foreground mt-6">
            Giris ekranina donmek icin{" "}
            <Link href="/login" className="text-orange-500 hover:text-orange-400">
              tikla
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
