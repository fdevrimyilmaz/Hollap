"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/components/ToastProvider";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = (() => {
    if (!password) return null;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (score <= 2) return { label: "Zayıf", color: "bg-red-500", textClass: "text-red-400", width: "w-1/3" };
    if (score <= 3) return { label: "Orta", color: "bg-amber-500", textClass: "text-amber-400", width: "w-2/3" };
    return { label: "Güçlü", color: "bg-emerald-500", textClass: "text-emerald-400", width: "w-full" };
  })();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email: normalizedEmail,
          password,
          role: isCreator ? "creator" : "subscriber",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Kayıt başarısız");
      }

      const payload = (await response.json()) as {
        message?: string;
        emailDelivery?: "sent" | "not_configured";
      };
      if (payload.emailDelivery === "not_configured") {
        showToast.success(
          "Kayıt tamamlandı",
          "E-posta servisi henüz yapılandırılmamış. Doğrulama bağlantısı sunucu loglarına yazıldı; yöneticine danış.",
        );
      } else {
        showToast.success(
          "Kayıt tamamlandı",
          payload.message ?? "Hesabı aktif etmek için e-postanıza gelen bağlantıyı kullanın",
        );
      }
      router.push(`/login?verification=sent&email=${encodeURIComponent(normalizedEmail)}`);
      router.refresh();
    } catch (error) {
      showToast.error(
        "Kayıt başarısız",
        error instanceof Error ? error.message : "Bilinmeyen hata"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden py-12">
      <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[150px]" aria-hidden="true" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-amber-500/15 rounded-full blur-[120px]" aria-hidden="true" />

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
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-2 tracking-tight">Hesap oluştur</h1>
          <p className="text-muted-foreground">Ücretsiz kayıt ol ve hemen başla</p>
        </div>

        <div className="glass-card rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/40">
          {/* Account Type Selection */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            <button
              type="button"
              onClick={() => setIsCreator(false)}
              className={`p-4 rounded-xl border transition-all text-center ${
                !isCreator
                  ? "border-orange-500/60 bg-orange-500/10 shadow-md shadow-orange-500/10"
                  : "border-white/10 hover:border-white/25 bg-white/[0.02]"
              }`}
              aria-pressed={!isCreator}
            >
              <svg className={`w-7 h-7 mx-auto mb-2 transition-colors ${!isCreator ? "text-orange-400" : "text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-semibold text-white block">Öğrenci</span>
              <p className="text-xs text-muted-foreground mt-0.5">Kurs satın al</p>
            </button>
            <button
              type="button"
              onClick={() => setIsCreator(true)}
              className={`p-4 rounded-xl border transition-all text-center ${
                isCreator
                  ? "border-orange-500/60 bg-orange-500/10 shadow-md shadow-orange-500/10"
                  : "border-white/10 hover:border-white/25 bg-white/[0.02]"
              }`}
              aria-pressed={isCreator}
            >
              <svg className={`w-7 h-7 mx-auto mb-2 transition-colors ${isCreator ? "text-orange-400" : "text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-semibold text-white block">Yaratıcı</span>
              <p className="text-xs text-muted-foreground mt-0.5">İçerik paylaş</p>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-white mb-2">
                Ad Soyad
              </label>
              <Input
                id="signup-name"
                type="text"
                placeholder="Adın Soyadın"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-white mb-2">
                E-posta
              </label>
              <Input
                id="signup-email"
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
              <label htmlFor="signup-password" className="block text-sm font-medium text-white mb-2">
                Şifre
              </label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="En az 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl pr-12"
                  autoComplete="new-password"
                  required
                  minLength={8}
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
              {passwordStrength && (
                <div className="mt-2 flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${passwordStrength.color} ${passwordStrength.width} transition-all rounded-full`} />
                  </div>
                  <span className={`text-xs font-medium ${passwordStrength.textClass}`}>{passwordStrength.label}</span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/30 focus:ring-offset-0"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug">
                <Link href="/terms" className="text-orange-400 hover:text-orange-300 transition-colors">Kullanım Şartları</Link> ve{" "}
                <Link href="/privacy" className="text-orange-400 hover:text-orange-300 transition-colors">
                  Gizlilik Politikası
                </Link>
                &apos;nı kabul ediyorum
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/30 font-medium text-base disabled:opacity-50"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
              ) : (
                isCreator ? "Yaratıcı Olarak Kayıt Ol" : "Hesap Oluştur"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Kayıt sonrası hesabınızı etkinleştirmek için e-posta doğrulaması gerekir.
            </p>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="px-3 bg-card text-muted-foreground">veya</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <Button asChild variant="outline" className="w-full h-11 border-white/10 hover:bg-white/5 hover:border-white/20 font-medium">
              <Link href="/api/auth/oauth/google">
                <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google ile kayıt ol
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-center mt-6 text-muted-foreground text-sm">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
