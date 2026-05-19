import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { listCatalogCategories, listCatalogProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

const levelLabel: Record<string, { label: string; classes: string }> = {
  Beginner: { label: "Başlangıç", classes: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5" },
  Intermediate: { label: "Orta", classes: "text-amber-400 border-amber-400/30 bg-amber-400/5" },
  Advanced: { label: "İleri", classes: "text-rose-400 border-rose-400/30 bg-rose-400/5" },
};

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categories = await listCatalogCategories();
  const category = categories.find((item) => item.id === id);

  if (!category) {
    notFound();
  }

  const categoryCourses = await listCatalogProducts({ category: category.name });

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="relative pt-28 lg:pt-32 pb-12 overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-50" aria-hidden="true" />
          <div className="container mx-auto px-4 relative z-10">
            <Link href="/categories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-6 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Tüm kategoriler
            </Link>
            <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
              Kategori
            </Badge>
            <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-4 tracking-tight leading-[1.05]">
              {category.name}
            </h1>
            <p className="text-pretty text-lg text-muted-foreground max-w-3xl leading-relaxed">
              Bu kategoride <span className="text-white font-semibold tabular-nums">{categoryCourses.length}</span> aktif ürün bulundu.
            </p>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4">
            {categoryCourses.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                {categoryCourses.map((course) => {
                  const level = levelLabel[course.level] ?? { label: course.level, classes: "text-muted-foreground border-white/10 bg-white/5" };
                  return (
                    <Link key={course.id} href={`/course/${course.id}`} className="group block">
                      <article className="glass-card rounded-2xl overflow-hidden card-hover h-full flex flex-col">
                        <div className="relative aspect-video overflow-hidden">
                          <Image
                            src={course.thumbnail}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                          <Badge className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 text-white font-medium">
                            {course.duration}
                          </Badge>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="outline" className={`text-xs font-medium ${level.classes}`}>
                              {level.label}
                            </Badge>
                          </div>
                          <h2 className="text-base lg:text-lg font-semibold text-white group-hover:text-orange-400 transition-colors line-clamp-2 mb-2 leading-snug">
                            {course.name}
                          </h2>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1 leading-relaxed">{course.description}</p>
                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="w-6 h-6 shrink-0">
                                <AvatarFallback className="text-[10px] bg-white/10">{course.creatorName[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground truncate">{course.creatorName}</span>
                            </div>
                            <span className="text-base font-display font-bold text-white tabular-nums shrink-0">
                              ${(course.amountCents / 100).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center max-w-xl mx-auto">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Bu kategoride henüz ürün yok</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Diğer kategorilerdeki ürünleri keşfetmek için genel listeye dönebilirsin.
                </p>
                <Link href="/courses">
                  <Button className="gradient-bg text-white border-0 shadow-lg shadow-orange-500/25">Tüm Kursları Gör</Button>
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
