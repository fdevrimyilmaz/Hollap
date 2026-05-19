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

  const [showDevHint, setShowDevHint] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<{
    google: boolean;
    github: boolean;
  }>({ google: false, github: false });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/oauth/providers", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setOauthProviders({
          google: Boolean(data.google),
          github: Boolean(data.github),
        });
      })
      .catch(() => {
        // Defensive: keep both providers hidden if the probe fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (verification === "sent") {
      showToast.success(
        "Doğrulama e-postası gönderildi",
        "Gelen kutunu kontrol et. Linki bulamazsan spam klasörüne bak."
      );
      if (process.env.NODE_ENV === "development") {
        setShowDevHint(true);
      }
    }

    if (verified === "1") {
      showToast.success("E-posta doğrulandı", "Hesabınıza şimdi giriş yapabilirsiniz");
      return;
    }

    if (verified === "0") {
      showToast.error("Doğrulama geçersiz", "Bağlantı geçersiz olabilir. Yeni bağlantı isteyebilirsiniz");
    }

    if (reset === "1") {
      showToast.success("Şifre güncellendi", "Yeni şifrenizle giriş yapabilirsiniz");
    }
  }, [verification, verified, reset]);

  useEffect(() => {
    if (!oauth) {
      return;
    }

    showToast.error(
      "Sosyal giriş başarısız",
      "OAuth işlemi tamamlanamadı. Lütfen tekrar deneyin."
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
      setFormError("Lütfen geçerli bir e-posta adresi girin.");
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
            ? `Çok fazla giriş denemesi yapıldı. ${retryAfter} saniye sonra tekrar deneyin.`
            : "Çok fazla giriş denemesi yapıldı. Lütfen biraz bekleyip tekrar deneyin.";
          setFormError(message);
          throw new Error(message);
        }

        if (response.status === 401) {
          const message =
            "E-posta veya şifre hatalı. E-postanızı doğrulamadıysanız aşağıdan yeni bağlantı isteyebilirsiniz.";
          setFormError(message);
          throw new Error(message);
        }

        const message = payload.error ?? "Giriş şu anda tamamlanamadı. Lütfen tekrar deneyin.";
        setFormError(message);
        throw new Error(message);
      }

      showToast.success("Giriş başarılı", "Panele yönlendiriliyorsunuz");
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      showToast.error("Giriş başarısız", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      showToast.error("E-posta gerekli", "Doğrulama bağlantısını göndermek için e-postanızı yazın");
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
        "Doğrulama bağlantısı talebi alındı",
        payload.message ?? "Eğer hesap doğrulama bekliyorsa e-posta gönderildi"
      );
    } catch {
      showToast.success(
        "Doğrulama bağlantısı talebi alındı",
        "Eğer hesap doğrulama bekliyorsa e-posta gönderildi"
      );
    } finally {
      setIsResendingVerification(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
        <div className="relative z-10 glass-card rounded-2xl px-6 py-4 flex items-center gap-3">
          <svg className="animate-spin h-4 w-4 text-orange-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Oturum kontrol ediliyor…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden py-12">
      <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[150px]" aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/15 rounded-full blur-[120px]" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-8">
            <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-2xl font-display font-bold text-white tracking-tight">
              Holl<span className="gradient-text">ap</span>
            </span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2 tracking-tight">Tekrar hoş geldin</h1>
          <p className="text-muted-foreground">Hesabına giriş yap ve keşfetmeye devam et</p>
        </div>

        {showDevHint && (
          <div className="mb-5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200 flex items-start gap-2.5">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong className="font-semibold">Geliştirme modu:</strong> SMTP yapılandırılmadı, doğrulama linki dev konsoluna yazıldı. Terminal çıktısını kontrol et.
            </span>
          </div>
        )}

        <div className="glass-card rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/40">
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
                className="h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl"
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
                  Şifre
                </label>
                <Link href="/forgot-password" className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
                  Şifremi unuttum
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl pr-12"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-white transition-colors"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-12 gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/30 font-medium text-base disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
              ) : (
                "Giriş Yap"
              )}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={isResendingVerification || !email.trim()}
            className="mt-4 text-sm text-orange-400 hover:text-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResendingVerification
              ? "Doğrulama bağlantısı gönderiliyor…"
              : "Doğrulama e-postasını tekrar gönder"}
          </button>

          {(oauthProviders.google || oauthProviders.github) ? (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                  <span className="px-3 bg-card text-muted-foreground">veya</span>
                </div>
              </div>

              <div className="space-y-2.5">
                {oauthProviders.google ? (
                  <Button asChild variant="outline" className="w-full h-11 border-white/10 hover:bg-white/5 hover:border-white/20 font-medium">
                    <Link href="/api/auth/oauth/google">
                      <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google ile devam et
                    </Link>
                  </Button>
                ) : null}

                {oauthProviders.github ? (
                  <Button asChild variant="outline" className="w-full h-11 border-white/10 hover:bg-white/5 hover:border-white/20 font-medium">
                    <Link href="/api/auth/oauth/github">
                      <svg className="w-4 h-4 mr-2.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub ile devam et
                    </Link>
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <p className="text-center mt-6 text-muted-foreground text-sm">
          Hesabın yok mu?{" "}
          <Link href="/signup" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
            Ücretsiz kayıt ol
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
          <p className="text-muted-foreground">Yükleniyor…</p>
        </main>
      )}
    >
      <LoginPageContent />
    </Suspense>
  );
}
