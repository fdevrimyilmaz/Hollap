import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { listCatalogProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(value);
}

const levelLabel: Record<string, { label: string; classes: string }> = {
  Beginner: { label: "Başlangıç", classes: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5" },
  Intermediate: { label: "Orta", classes: "text-amber-400 border-amber-400/30 bg-amber-400/5" },
  Advanced: { label: "İleri", classes: "text-rose-400 border-rose-400/30 bg-rose-400/5" },
};

export default async function CoursesPage() {
  const courses = await listCatalogProducts();

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="relative pt-28 lg:pt-32 pb-12 overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-50" aria-hidden="true" />
          <div className="container mx-auto px-4 relative z-10">
            <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
              Tüm Kurslar
            </Badge>
            <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-4 tracking-tight leading-[1.05]">
              Öğrenmek istediğin <span className="gradient-text">konuyu seç</span>
            </h1>
            <p className="text-pretty text-lg text-muted-foreground max-w-3xl leading-relaxed">
              Programlama, tasarım, fitness ve daha fazlasında yayındaki tüm kursları tek yerden inceleyebilirsin.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                <span className="text-white font-semibold tabular-nums">{courses.length}</span> kurs listeleniyor
              </span>
              <span className="text-muted-foreground/40">•</span>
              <Link href="/explore" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                Gelişmiş filtrelerle keşfet →
              </Link>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4">
            {courses.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                {courses.map((course) => {
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
                          <div className="absolute top-3 left-3 flex gap-2">
                            {course.isFeatured && (
                              <Badge className="gradient-bg border-0 text-white font-semibold shadow-md shadow-orange-500/30">
                                Öne Çıkan
                              </Badge>
                            )}
                          </div>
                          <Badge className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 text-white font-medium">
                            {course.duration}
                          </Badge>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Badge variant="outline" className="text-xs border-white/10 bg-white/[0.03] text-muted-foreground font-medium">
                              {course.category}
                            </Badge>
                            <Badge variant="outline" className={`text-xs font-medium ${level.classes}`}>
                              {level.label}
                            </Badge>
                          </div>
                          <h2 className="text-base lg:text-lg font-semibold text-white group-hover:text-orange-400 transition-colors mb-2 line-clamp-2 leading-snug">
                            {course.name}
                          </h2>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1 leading-relaxed">
                            {course.description}
                          </p>

                          <div className="flex items-center gap-2.5 mb-4">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-[11px] bg-white/10">{course.creatorName[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-muted-foreground truncate">{course.creatorName}</span>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-3.5 text-sm">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="font-medium text-white tabular-nums">{course.rating.toFixed(1)}</span>
                              </div>
                              <span className="text-muted-foreground tabular-nums">{formatNumber(course.students)} öğrenci</span>
                            </div>
                            <span className="text-lg font-display font-bold text-white tabular-nums">
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Henüz yayında kurs yok</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Yeni içerikler yayınlandıkça bu sayfada listelenecek.
                </p>
                <Link href="/become-creator">
                  <Button className="gradient-bg text-white border-0 shadow-lg shadow-orange-500/25">
                    İlk kursu sen yayınla
                  </Button>
                </Link>
              </div>
            )}

            {courses.length > 0 && (
              <div className="mt-12 text-center">
                <Link href="/explore">
                  <Button variant="outline" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
                    Gelişmiş Filtrelerle Keşfet
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
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
