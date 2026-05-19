import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description:
    "Hollap fiyatlandırma modeli: sabit aylık üyelik yok. Fiyatı içerik üreticisi belirler, platform yalnızca satıştan %20 komisyon alır.",
};

const pricingHighlights = [
  {
    title: "Fiyat Kontrolü",
    value: "%100",
    description: "Kurs, üyelik ve dijital ürün fiyatını içerik üreticisi belirler.",
    hint: "Üreticide",
  },
  {
    title: "Platform Komisyonu",
    value: "%20",
    description: "Sadece gerçekleşen satışlardan komisyon alınır.",
    hint: "Satış başına",
  },
  {
    title: "Net Gelir Payı",
    value: "%80",
    description: "Her satışın %80'i içerik üreticisine, %20'si platforma ayrılır.",
    hint: "Üreticiye kalan",
  },
];

const controls = [
  {
    title: "Kurs Fiyatı",
    detail: "Her kurs için ayrı fiyat belirleyebilir, zaman bazlı kampanya uygulayabilirsin.",
  },
  {
    title: "Üyelik Katmanları",
    detail: "Free, Supporter, VIP gibi katmanları farklı fiyatlarla sunabilirsin.",
  },
  {
    title: "DM ve Özel Ürünler",
    detail: "Birebir teklif, PPV ve özel ürün satışlarında fiyat tamamen senin kontrolünde olur.",
  },
  {
    title: "Anlık Güncelleme",
    detail: "Yönetim panelinden fiyat ve stok bilgilerini istediğin zaman güncelleyebilirsin.",
  },
];

const faqs = [
  {
    question: "Fiyatları kim belirliyor?",
    answer:
      "Tüm içerik fiyatlarını (kurs, üyelik, ürün) doğrudan içerik üreticisi belirler ve günceller.",
  },
  {
    question: "Minimum veya maksimum fiyat var mı?",
    answer:
      "Platform sabit paket fiyatı dayatmaz. Üretici, hedef kitlesine göre fiyat aralığını özgürce belirler.",
  },
  {
    question: "Fiyat değişince ne olur?",
    answer:
      "Yeni fiyat anında aktif olur. Mevcut siparişler kendi oluştukları fiyat üzerinden devam eder.",
  },
  {
    question: "Platformun geliri nasıl oluşuyor?",
    answer:
      "Platform sadece satıştan %20 komisyon alır. Sabit aylık plan satın alma zorunluluğu yoktur.",
  },
];

export default function PricingPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="pt-28 lg:pt-32 pb-16 relative overflow-hidden">
          <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]" aria-hidden="true" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-4xl mx-auto mb-14">
              <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
                Fiyatlandırma Modeli
              </Badge>
              <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-6 tracking-tight leading-[1.05]">
                Fiyatı <span className="gradient-text">içerik üreticisi</span> belirler
              </h1>
              <p className="text-pretty text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                Sabit paket dayatması yok. Üretici fiyatını kendi stratejisine göre belirler;
                platform her satışın yalnızca %20&apos;sini komisyon olarak alır.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/25 h-12 px-7 font-medium"
                  >
                    Panelde Fiyat Belirle
                  </Button>
                </Link>
                <Link href="/become-creator">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 h-12 px-7 font-medium"
                  >
                    Yaratıcı Programı
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto">
              {pricingHighlights.map((item) => (
                <article key={item.title} className="glass-card rounded-2xl p-7 card-hover">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">{item.title}</p>
                  <p className="text-4xl lg:text-5xl font-display font-bold gradient-text mb-2 tabular-nums">{item.value}</p>
                  <p className="text-xs text-orange-400/80 font-medium mb-3">{item.hint}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3 tracking-tight">
                  Üreticinin <span className="gradient-text">fiyat kontrol noktaları</span>
                </h2>
                <p className="text-muted-foreground">İşine en uygun fiyatlandırmayı yarat.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {controls.map((item) => (
                  <article key={item.title} className="glass rounded-2xl p-6 card-hover">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white mb-1.5">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.04] to-transparent" aria-hidden="true" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
                SSS
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-3 tracking-tight">Sıkça sorulan sorular</h2>
              <p className="text-muted-foreground">Fiyatlandırma modeliyle ilgili temel cevaplar.</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group glass-card rounded-2xl p-6 open:bg-white/[0.04] transition-colors"
                >
                  <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                    <h3 className="font-semibold text-white pr-4">{faq.question}</h3>
                    <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center transition-transform group-open:rotate-45">
                      <svg className="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </span>
                  </summary>
                  <p className="text-muted-foreground mt-4 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
