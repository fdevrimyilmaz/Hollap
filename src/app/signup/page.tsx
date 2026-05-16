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
  const [isCreator, setIsCreator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        throw new Error(payload.error ?? "Kayit basarisiz");
      }

      const payload = (await response.json()) as { message?: string };
      showToast.success(
        "Kayit tamamlandi",
        payload.message ?? "Hesabi aktif etmek icin e-postaniza gelen linki kullanin"
      );
      router.push(`/login?verification=sent&email=${encodeURIComponent(normalizedEmail)}`);
      router.refresh();
    } catch (error) {
      showToast.error(
        "Kayit basarisiz",
        error instanceof Error ? error.message : "Bilinmeyen hata"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden py-12">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-amber-500/15 rounded-full blur-[120px]" />

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
          <h1 className="text-3xl font-bold text-white mb-2">Hesap Olustur</h1>
          <p className="text-muted-foreground">Ucretsiz kayit ol ve hemen basla</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {/* Account Type Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setIsCreator(false)}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                !isCreator
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-sm font-medium text-white">Ogrenci</span>
              <p className="text-xs text-muted-foreground mt-1">Kurs satin al</p>
            </button>
            <button
              type="button"
              onClick={() => setIsCreator(true)}
              className={`p-4 rounded-xl border-2 transition-all text-center ${
                isCreator
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-white">Yaratici</span>
              <p className="text-xs text-muted-foreground mt-1">Icerik paylas</p>
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
                placeholder="Adin Soyadin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-white/5 border-white/10 focus:border-orange-500/50"
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
                className="h-12 bg-white/5 border-white/10 focus:border-orange-500/50"
                required
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-white mb-2">
                Sifre
              </label>
              <Input
                id="signup-password"
                type="password"
                placeholder="En az 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-white/5 border-white/10 focus:border-orange-500/50"
                required
                minLength={8}
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/20"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                <Link href="/terms" className="text-orange-500 hover:text-orange-400">Kullanim Sartlari</Link> ve{" "}
                <Link href="/privacy" className="text-orange-500 hover:text-orange-400">
                  Gizlilik Politikasi
                </Link>
                &apos;ni kabul ediyorum
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 gradient-bg hover:opacity-90 text-white border-0 shadow-lg shadow-orange-500/25"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                isCreator ? "Yaratici Olarak Kayit Ol" : "Kayit Ol"
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Kayit sonrasi hesabinizi etkinlestirmek icin e-posta dogrulamasi gerekir.
            </p>
          </form>

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
              Google ile kayit ol
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-center mt-6 text-muted-foreground">
          Zaten hesabin var mi?{" "}
          <Link href="/login" className="text-orange-500 hover:text-orange-400 font-medium">
            Giris yap
          </Link>
        </p>
      </div>
    </main>
  );
}

