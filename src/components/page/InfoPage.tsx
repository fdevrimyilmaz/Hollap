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
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-28 pb-10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-4 border-orange-500/50 text-orange-500">
              {badge}
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {description}
            </p>

            {(primaryCta || secondaryCta) && (
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                {primaryCta && (
                  <Link href={primaryCta.href}>
                    <Button className="gradient-bg hover:opacity-90 text-white border-0">
                      {primaryCta.label}
                    </Button>
                  </Link>
                )}
                {secondaryCta && (
                  <Link href={secondaryCta.href}>
                    <Button variant="outline" className="border-white/20 hover:bg-white/5">
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
          <div className="grid md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <article key={section.title} className="glass-card rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-3">{section.title}</h2>
                <p className="text-muted-foreground">{section.description}</p>

                {section.points && section.points.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {section.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2" />
                        <span className="text-sm text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
