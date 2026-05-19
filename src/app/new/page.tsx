import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCatalogProducts } from "@/lib/server/catalog";

export const metadata: Metadata = {
  title: "Yeni İçerikler",
  description: "Hollap'ta son eklenen ürünleri tarih sırasına göre keşfet.",
};

export const dynamic = "force-dynamic";

export default async function NewContentPage() {
  const latestCourses = await listCatalogProducts({ includeOutOfStock: true });

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="relative pt-28 lg:pt-32 pb-10 overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-50" aria-hidden="true" />
          <div className="container mx-auto px-4 relative z-10">
            <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
              Yeni İçerikler
            </Badge>
            <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-4 tracking-tight leading-[1.05]">
              Yeni <span className="gradient-text">eklenenler</span>
            </h1>
            <p className="text-pretty text-lg text-muted-foreground max-w-3xl leading-relaxed">
              Son eklenen ürünleri tarih sırasına göre inceleyebilirsin.
            </p>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4">
            {latestCourses.length > 0 ? (
              <div className="space-y-3 max-w-5xl">
                {latestCourses.map((course, index) => (
                  <Link key={course.id} href={`/course/${course.id}`} className="block group">
                    <article className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center card-hover">
                      <div className="w-full sm:w-44 aspect-video sm:h-28 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/5">
                        <Image
                          src={course.thumbnail}
                          alt=""
                          width={176}
                          height={112}
                          sizes="(min-width: 640px) 176px, 100vw"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium tabular-nums">
                            #{String(index + 1).padStart(2, "0")}
                          </span>
                          <Badge variant="outline" className="text-xs border-white/10 bg-white/[0.03] text-muted-foreground">
                            {course.category}
                          </Badge>
                        </div>
                        <h2 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors line-clamp-1 leading-snug">
                          {course.name}
                        </h2>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                          {course.description}
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-3 sm:gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <p className="text-sm text-muted-foreground truncate">{course.creatorName}</p>
                        <p className="text-xl font-display font-bold text-white tabular-nums">${(course.amountCents / 100).toFixed(0)}</p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center max-w-xl mx-auto">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Yeni içerik yok</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Yakında yeni ürünler yayında olacak.
                </p>
                <Link href="/explore">
                  <Button className="gradient-bg text-white border-0 shadow-lg shadow-orange-500/25">Tümünü keşfet</Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
