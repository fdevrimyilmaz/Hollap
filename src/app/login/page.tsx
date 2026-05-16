"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ToastProvider";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const verified = searchParams.get("verified");
  const verification = searchParams.get("verification");
  const reset = searchParams.get("reset");
  const emailHint = searchParams.get("email");
  const oauth = searchParams.get("oauth");

  useEffect(() => {
    if (emailHint?.trim()) {
      setEmail(emailHint.trim().toLowerCase());
    }
  }, [emailHint]);

  useEffect(() => {
    if (verification === "sent") {
      showToast.success(
        "Dogrulama e-postasi gonderildi",
        "Gelen kutunuzu kontrol edin. Linki bulamazsaniz spam klasorune bakin."
      );
    }

    if (verified === "1") {
      showToast.success("E-posta dogrulandi", "Hesabiniza simdi giris yapabilirsiniz");
      return;
    }

    if (verified === "0") {
      showToast.error("Dogrulama gecersiz", "Link gecersiz olabilir. Yeni baglanti isteyebilirsiniz");
    }

    if (reset === "1") {
      showToast.success("Sifre guncellendi", "Yeni sifrenizle giris yapabilirsiniz");
    }
  }, [verification, verified, reset]);

  useEffect(() => {
    if (!oauth) {
      return;
    }

    showToast.error(
      "Sosyal giris basarisiz",
      "OAuth islemi tamamlanamadi. Lutfen tekrar deneyin."
    );
  }, [oauth]);

  useEffect(() => {
    let cancelled = false;

    const verifyActiveSession = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        });

        if (cancelled) {
          return;
        }

        if (response.ok) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
      } finally {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    };

    void verifyActiveSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const normalizeEmail = email.trim().toLowerCase();
  const emailLooksValid = EMAIL_PATTERN.test(normalizeEmail);
  const canSubmit = emailLooksValid && password.length > 0 && !isLoading && !isCheckingSession;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!emailLooksValid) {
      setFormError("Lutfen gecerli bir e-posta adresi girin.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizeEmail, password }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        const retryAfter = response.headers.get("Retry-After");

        if (response.status === 429) {
          const message = retryAfter
            ? `Cok fazla giris denemesi yapildi. ${retryAfter} saniye sonra tekrar deneyin.`
            : "Cok fazla giris denemesi yapildi. Lutfen biraz bekleyip tekrar deneyin.";
          setFormError(message);
          throw new Error(message);
        }

        if (response.status === 401) {
          const message =
            "E-posta veya sifre hatali. E-postanizi dogrulamadiysaniz alttan dogrulama baglantisi isteyebilirsiniz.";
          setFormError(message);
          throw new Error(message);
        }

        const message = payload.error ?? "Giris su anda tamamlanamadi. Lutfen tekrar deneyin.";
        setFormError(message);
        throw new Error(message);
      }

      showToast.success("Giris basarili", "Dashboard'a yonlendiriliyorsunuz");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      showToast.error("Giris basarisiz", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      showToast.error("E-posta gerekli", "Dogrulama baglantisini gondermek icin e-postanizi yazin");
      return;
    }

    setFormError(null);
    setIsResendingVerification(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { message?: string };
      showToast.success(
        "Dogrulama baglantisi talebi alindi",
        payload.message ?? "Eger hesap dogrulama bekliyorsa e-posta gonderildi"
      );
    } catch {
      showToast.success(
        "Dogrulama baglantisi talebi alindi",
        "Eger hesap dogrulama bekliyorsa e-posta gonderildi"
      );
    } finally {
      setIsResendingVerification(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="relative z-10 glass-card rounded-2xl px-6 py-4">
          <p className="text-sm text-muted-foreground">Oturum kontrol ediliyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/15 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">
              Holl<span className="gradient-text">ap</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Tekrar Hosgeldin</h1>
          <p className="text-muted-foreground">Hesabina giris yap ve kesfetmeye basla</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-white mb-2">
                E-posta
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-white/5 border-white/10 focus:border-orange-500/50"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password" className="block text-sm font-medium text-white">
                  Sifre
                </label>
                <Link href="/forgot-password" className="text-sm text-orange-500 hover:text-orange-400">
                  Sifremi unuttum
                </Link>
              </div>
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-white/5 border-white/10 focus:border-orange-500/50"
                autoComplete="current-password"
                required
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-white transition-colors"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Sifreyi gizle" : "Sifreyi goster"}
                </button>
              </div>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {formError}
              </div>
            )}

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-12 gradient-bg hover:opacity-90 text-white border-0 shadow-lg shadow-orange-500/25"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "Giris Yap"
              )}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={isResendingVerification || !email.trim()}
            className="mt-3 text-sm text-orange-500 hover:text-orange-400 disabled:opacity-60"
          >
            {isResendingVerification
              ? "Dogrulama baglantisi gonderiliyor..."
              : "Dogrulama e-postasini tekrar gonder"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground">veya</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button asChild variant="outline" className="w-full h-12 border-white/10 hover:bg-white/5">
              <Link href="/api/auth/oauth/google">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google ile devam et
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full h-12 border-white/10 hover:bg-white/5">
              <Link href="/api/auth/oauth/github">
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub ile devam et
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-center mt-6 text-muted-foreground">
          Hesabin yok mu?{" "}
          <Link href="/signup" className="text-orange-500 hover:text-orange-400 font-medium">
            Ucretsiz kayit ol
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={(
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Yukleniyor...</p>
        </main>
      )}
    >
      <LoginPageContent />
    </Suspense>
  );
}

