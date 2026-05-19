"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ToastProvider";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const resetMode = useMemo(() => token.length > 0, [token]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token")?.trim() ?? "");
  }, []);

  const onRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as {
        message?: string;
        emailDelivery?: "sent" | "not_configured";
      };

      if (payload.emailDelivery === "not_configured") {
        showToast.success(
          "Sıfırlama talebi alındı",
          "E-posta servisi henüz yapılandırılmamış. Sıfırlama bağlantısı sunucu loglarına yazıldı.",
        );
      } else {
        showToast.success(
          "Sıfırlama talebi alındı",
          payload.message ?? "E-posta adresine şifre sıfırlama bağlantısı gönderildi",
        );
      }

      setEmail("");
    } catch {
      showToast.success(
        "Sıfırlama talebi alındı",
        "Eğer e-posta sistemde kayıtlıysa sıfırlama bağlantısı gönderilir"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResetPassword = async (event: FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      showToast.error("Şifreler uyuşmuyor", "Lütfen şifreleri tekrar kontrol edin");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Şifre güncellenemedi");
      }

      showToast.success("Şifre güncellendi", "Yeni şifrenizle giriş yapabilirsiniz");
      setPassword("");
      setConfirmPassword("");
      router.push("/login?reset=1");
      router.refresh();
    } catch (error) {
      showToast.error(
        "Şifre güncellenemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-12">
      <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[150px]" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-8 justify-center w-full">
          <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-orange-500/30">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-2xl font-display font-bold text-white tracking-tight">
            Holl<span className="gradient-text">ap</span>
          </span>
        </Link>

        <div className="glass-card rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/40">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2 tracking-tight">
            {resetMode ? "Yeni şifre belirle" : "Şifremi unuttum"}
          </h1>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            {resetMode
              ? "Güvenli bir şifre belirleyin. İşlem sonunda tüm aktif oturumlar kapatılır."
              : "Kayıtlı e-posta adresini girin. Şifre sıfırlama bağlantısı gönderelim."}
          </p>

          {!resetMode ? (
            <form onSubmit={onRequestReset} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-white mb-2">
                  E-posta
                </label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ornek@email.com"
                  className="h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/30 font-medium"
              >
                {isSubmitting ? "Gönderiliyor…" : "Sıfırlama Bağlantısı Gönder"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onResetPassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-white mb-2">
                  Yeni şifre
                </label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="En az 8 karakter"
                  className="h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-white mb-2">
                  Şifre (tekrar)
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Yeni şifrenizi tekrarlayın"
                  className="h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/30 font-medium"
              >
                {isSubmitting ? "Güncelleniyor…" : "Şifreyi Güncelle"}
              </Button>
            </form>
          )}

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Giriş ekranına dönmek için{" "}
            <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
              tıkla
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
