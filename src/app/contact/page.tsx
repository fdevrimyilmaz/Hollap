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

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    showToast.success("Mesajin alindi", "En kisa surede sana donus yapacagiz");
    setName("");
    setEmail("");
    setMessage("");
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
            <div className="space-y-3 text-muted-foreground">
              <p>Destek: <a className="text-orange-500 hover:text-orange-400" href="mailto:support@hollap.dev">support@hollap.dev</a></p>
              <p>Partnerlik: <a className="text-orange-500 hover:text-orange-400" href="mailto:partners@hollap.dev">partners@hollap.dev</a></p>
              <p>Topluluk: <Link className="text-orange-500 hover:text-orange-400" href="/community">Topluluk sayfasi</Link></p>
            </div>
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
              <Button className="gradient-bg hover:opacity-90 text-white border-0">Gonder</Button>
            </form>
          </article>
        </div>
      </section>

      <Footer />
    </main>
  );
}
