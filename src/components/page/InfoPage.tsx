import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Cta = {
  label: string;
  href: string;
};

type InfoSection = {
  title: string;
  description: string;
  points?: string[];
};

type InfoPageProps = {
  badge: string;
  title: string;
  description: string;
  sections: InfoSection[];
  primaryCta?: Cta;
  secondaryCta?: Cta;
};

export function InfoPage({
  badge,
  title,
  description,
  sections,
  primaryCta,
  secondaryCta,
}: InfoPageProps) {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="relative pt-28 lg:pt-32 pb-12 overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-50" aria-hidden="true" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
                {badge}
              </Badge>
              <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-5 tracking-tight leading-[1.05]">
                {title}
              </h1>
              <p className="text-pretty text-lg text-muted-foreground leading-relaxed">
                {description}
              </p>

              {(primaryCta || secondaryCta) && (
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  {primaryCta && (
                    <Link href={primaryCta.href}>
                      <Button
                        size="lg"
                        className="gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/25 h-12 px-7 font-medium"
                      >
                        {primaryCta.label}
                        <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Button>
                    </Link>
                  )}
                  {secondaryCta && (
                    <Link href={secondaryCta.href}>
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 h-12 px-7 font-medium"
                      >
                        {secondaryCta.label}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-5 lg:gap-6 max-w-5xl">
              {sections.map((section, index) => (
                <article key={section.title} className="glass-card rounded-2xl p-7 card-hover">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-display font-bold text-base tabular-nums shrink-0">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <h2 className="text-xl font-display font-semibold text-white pt-1.5 tracking-tight">{section.title}</h2>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{section.description}</p>

                  {section.points && section.points.length > 0 && (
                    <ul className="mt-5 space-y-2.5">
                      {section.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5">
                          <svg className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-muted-foreground leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
