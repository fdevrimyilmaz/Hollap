"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ToastProvider";

const channels = [
  {
    title: "Teknik Destek",
    email: "support@hollap.com",
    description: "Hesap, ödeme ve platform kullanımı ile ilgili talepler.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
      </svg>
    ),
  },
  {
    title: "İş Birliği & Partnerlik",
    email: "partners@hollap.com",
    description: "Marka iş birlikleri, kurum paketleri ve stratejik ortaklıklar.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Mesaj gönderilemedi");
      }

      showToast.success("Mesajın alındı", "En kısa sürede sana dönüş yapacağız");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      showToast.error(
        "Mesaj gönderilemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="relative pt-28 lg:pt-32 pb-12 overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-50" aria-hidden="true" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
                İletişim
              </Badge>
              <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-4 tracking-tight leading-[1.05]">
                Bizimle <span className="gradient-text">iletişime geç</span>
              </h1>
              <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
                Soru, öneri veya destek talebin için bize ulaşabilirsin. Genellikle 24 saat içinde yanıt veriyoruz.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4 grid lg:grid-cols-[1fr_1.2fr] gap-6">
            <div className="space-y-4">
              {channels.map((channel) => (
                <article key={channel.title} className="glass-card rounded-2xl p-6 card-hover">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 shrink-0">
                      {channel.icon}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-white mb-1">{channel.title}</h2>
                      <a
                        href={`mailto:${channel.email}`}
                        className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors break-all"
                      >
                        {channel.email}
                      </a>
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {channel.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              <article className="glass-card rounded-2xl p-6 card-hover">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-white mb-1">Topluluk & Duyurular</h2>
                    <Link
                      href="/community"
                      className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                    >
                      Topluluk sayfasını ziyaret et →
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      Etkinlikler, güncellemeler ve topluluk iletişimi.
                    </p>
                  </div>
                </div>
              </article>
            </div>

            <article className="glass-card rounded-2xl p-7 sm:p-8">
              <h2 className="text-xl font-display font-semibold text-white mb-1 tracking-tight">Mesaj gönder</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Form üzerinden de iletebilirsin; aynı kanaldan döneriz.
              </p>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-white mb-2">Ad Soyad</label>
                  <Input
                    id="contact-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Adın Soyadın"
                    className="h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl"
                    autoComplete="name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-white mb-2">E-posta</label>
                  <Input
                    id="contact-email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    placeholder="ornek@email.com"
                    className="h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-white mb-2">Mesaj</label>
                  <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Bize neyi sormak istediğini yaz…"
                    className="bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl min-h-[140px] resize-y"
                    required
                  />
                </div>
                <Button
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-12 gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/30 font-medium px-6"
                >
                  {isSubmitting ? "Gönderiliyor…" : "Mesajı Gönder"}
                </Button>
              </form>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
