import Link from "next/link";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "%0", label: "Başlangıç Maliyeti", hint: "Kayıt ücretsiz" },
  { value: "%80", label: "Kazanç Payı", hint: "Sana kalan kısım" },
  { value: "7/24", label: "Destek", hint: "Türkçe ekip" },
];

export function CTASection() {
  return (
    <section className="py-24 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] max-w-[90vw] bg-orange-500/15 rounded-full blur-[160px]" aria-hidden="true" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass mb-7">
            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-medium text-muted-foreground">Hemen başla, dakikalar içinde yayında ol</span>
          </div>

          <h2 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-6 tracking-tight leading-[1.05]">
            Bilgini paylaşmaya <span className="gradient-text">hazır mısın?</span>
          </h2>
          <p className="text-pretty text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Binlerce yaratıcı gibi sen de tutkunu kariyerine dönüştür.
            Ücretsiz başla, yalnızca kazandığında küçük bir komisyon öde.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
            <Link href="/become-creator">
              <Button
                size="lg"
                className="gradient-bg hover:opacity-95 text-white border-0 px-8 h-12 text-base font-medium w-full sm:w-auto animate-pulse-glow"
              >
                Ücretsiz Başla
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 px-8 h-12 text-base font-medium w-full sm:w-auto"
              >
                Nasıl Çalışır?
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl px-6 py-5">
                <div className="text-3xl lg:text-4xl font-display font-bold gradient-text mb-1 tabular-nums">{stat.value}</div>
                <div className="text-sm font-medium text-white">{stat.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.hint}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
