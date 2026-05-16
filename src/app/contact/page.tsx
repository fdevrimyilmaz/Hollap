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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Mesaj gonderilemedi");
      }

      showToast.success("Mesajin alindi", "En kisa surede sana donus yapacagiz");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      showToast.error(
        "Mesaj gonderilemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-28 pb-12">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-4 border-orange-500/50 text-orange-500">
            Iletisim
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Bizimle Iletisime Gec</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Herhangi bir soru, oneri veya destek talebin icin bize ulasabilirsin.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-6">
          <article className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-3">Iletisim Kanallari</h2>
            <p className="text-muted-foreground">
              Talebinin turune gore asagidaki kanallardan bize ulasabilirsin.
            </p>
            <ul className="mt-4 space-y-4 text-muted-foreground">
              <li>
                <p className="text-white font-medium">Teknik Destek</p>
                <a className="text-orange-500 hover:text-orange-400" href="mailto:support@hollap.com">
                  support@hollap.com
                </a>
                <p className="text-sm text-muted-foreground/90">
                  Hesap, odeme ve platform kullanimi ile ilgili talepler.
                </p>
              </li>
              <li>
                <p className="text-white font-medium">Is Birligi ve Partnerlik</p>
                <a className="text-orange-500 hover:text-orange-400" href="mailto:partners@hollap.com">
                  partners@hollap.com
                </a>
                <p className="text-sm text-muted-foreground/90">
                  Marka is birlikleri, kurum paketleri ve stratejik ortakliklar.
                </p>
              </li>
              <li>
                <p className="text-white font-medium">Topluluk ve Duyurular</p>
                <Link className="text-orange-500 hover:text-orange-400" href="/community">
                  Topluluk sayfasi
                </Link>
                <p className="text-sm text-muted-foreground/90">
                  Etkinlikler, guncellemeler ve topluluk iletisimleri.
                </p>
              </li>
            </ul>
          </article>

          <article className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Mesaj Gonder</h2>
            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ad Soyad"
                className="bg-white/5 border-white/10"
                required
              />
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="E-posta"
                className="bg-white/5 border-white/10"
                required
              />
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Mesajini yaz"
                className="bg-white/5 border-white/10 min-h-[120px]"
                required
              />
              <Button
                disabled={isSubmitting}
                className="gradient-bg hover:opacity-90 text-white border-0"
              >
                {isSubmitting ? "Gonderiliyor..." : "Gonder"}
              </Button>
            </form>
          </article>
        </div>
      </section>

      <Footer />
    </main>
  );
}
