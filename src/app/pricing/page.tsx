"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const pricingHighlights = [
  {
    title: "Fiyat Kontrolu",
    value: "100% Ureticide",
    description: "Kurs, uyelik ve dijital urun fiyatini icerik ureticisi belirler.",
  },
  {
    title: "Platform Komisyonu",
    value: "%20",
    description: "Sadece gerceklesen satislardan komisyon alinir.",
  },
  {
    title: "Listeleme Esnekligi",
    value: "%80 Net Gelir",
    description: "Her satisin %80'i icerik ureticisine, %20'si platforma ayrilir.",
  },
];

const controls = [
  {
    title: "Kurs Fiyati",
    detail: "Her kurs icin ayri fiyat belirleyebilir, zaman bazli kampanya uygulayabilirsin.",
  },
  {
    title: "Uyelik Katmanlari",
    detail: "Free, Supporter, VIP gibi katmanlari farkli fiyatlarla sunabilirsin.",
  },
  {
    title: "DM ve Ozel Urunler",
    detail: "Birebir teklif, PPV ve ozel urun satislarinda fiyat tamamen senin kontrolunde olur.",
  },
  {
    title: "Anlik Guncelleme",
    detail: "Dashboard uzerinden fiyat ve stok bilgilerini istedigin zaman guncelleyebilirsin.",
  },
];

const faqs = [
  {
    question: "Fiyatlari kim belirliyor?",
    answer:
      "Tum icerik fiyatlarini (kurs, uyelik, urun) dogrudan icerik ureticisi belirler ve gunceller.",
  },
  {
    question: "Minimum veya maksimum fiyat var mi?",
    answer:
      "Platform sabit paket fiyati dayatmaz. Uretici, hedef kitlesine gore fiyat araligini ozgurce belirler.",
  },
  {
    question: "Fiyat degisince ne olur?",
    answer:
      "Yeni fiyat aninda aktif olur. Mevcut siparisler kendi olustuklari fiyat uzerinden devam eder.",
  },
  {
    question: "Platformun geliri nasil olusuyor?",
    answer:
      "Platform sadece satistan %20 komisyon alir. Sabit aylik plan satin alma zorunlulugu yoktur.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <Badge variant="outline" className="mb-4 border-orange-500/50 text-orange-500">
              Fiyatlandirma Modeli
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Fiyati <span className="gradient-text">Icerik Ureticisi</span> Belirler
            </h1>
            <p className="text-lg text-muted-foreground">
              Sabit paket dayatmasi yok. Uretici fiyatini kendi stratejisine gore belirler,
              platform her satisin yalnizca %20&apos;sini komisyon olarak alir.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/dashboard">
                <Button className="gradient-bg hover:opacity-90 text-white border-0">
                  Dashboard&apos;da Fiyat Belirle
                </Button>
              </Link>
              <Link href="/become-creator">
                <Button variant="outline" className="border-white/20 hover:bg-white/5">
                  Yaratici Programi
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {pricingHighlights.map((item) => (
              <article key={item.title} className="glass-card rounded-2xl p-6 card-hover">
                <p className="text-sm text-muted-foreground mb-2">{item.title}</p>
                <p className="text-3xl font-bold gradient-text mb-3">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              Ureticinin Fiyat Kontrol Noktalari
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {controls.map((item) => (
                <article key={item.title} className="glass rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Sikca Sorulan Sorular</h2>
            <p className="text-muted-foreground">Fiyatlandirma modeliyle ilgili temel cevaplar</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="glass rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
