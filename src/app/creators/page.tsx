import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listCatalogCategories, listCatalogCreators } from "@/lib/server/catalog";

type CreatorSearchParams = {
  q?: string | string[];
};

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(value);
}

export const dynamic = "force-dynamic";

export default async function CreatorsPage({
  searchParams,
}: {
  searchParams?: Promise<CreatorSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const qParam = Array.isArray(resolvedSearchParams.q)
    ? resolvedSearchParams.q[0]
    : resolvedSearchParams.q;
  const searchQuery = qParam?.trim() ?? "";

  const [creators, categories] = await Promise.all([
    listCatalogCreators({ q: searchQuery.length ? searchQuery : undefined }),
    listCatalogCategories(),
  ]);

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="relative pt-28 lg:pt-32 pb-10 overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-50" aria-hidden="true" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl">
              <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
                Yaratıcılar
              </Badge>
              <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-4 tracking-tight leading-[1.05]">
                Uzman <span className="gradient-text">yaratıcıları</span> keşfet
              </h1>
              <p className="text-pretty text-lg text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                Canlı katalogdaki aktif yaratıcıları ve satışa açık ürünlerini tek ekranda incele.
              </p>

              <form method="get" className="relative max-w-md" role="search">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Yaratıcı veya ürün ara…"
                  aria-label="Yaratıcı ara"
                  className="pl-11 h-12 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl"
                />
              </form>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4">
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-8 -mx-4 px-4 scroll-smooth">
                <Link href="/creators" className="shrink-0">
                  <Button size="sm" className="gradient-bg text-white border-0 font-medium shadow-md shadow-orange-500/20">
                    Tüm kategoriler
                  </Button>
                </Link>
                {categories.map((category) => (
                  <Link key={category.id} href={`/category/${category.id}`} className="shrink-0">
                    <Button size="sm" variant="outline" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 font-medium">
                      {category.name}
                      <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{category.count}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            )}

            {creators.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                {creators.map((creator) => (
                  <Link key={creator.id} href={creator.profilePath} className="group block">
                    <article className="glass-card rounded-2xl overflow-hidden card-hover h-full">
                      <div className="relative h-32 overflow-hidden">
                        <Image
                          src={creator.coverImage}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                        <Badge className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 text-white font-medium">
                          {creator.category}
                        </Badge>
                      </div>

                      <div className="relative px-5 pb-5 pt-0">
                        <div className="relative -mt-9 mb-4 inline-block">
                          <Avatar className="w-16 h-16 border-4 border-background ring-2 ring-orange-500/40 group-hover:ring-orange-500 transition-all">
                            <AvatarImage src={creator.avatar} alt={creator.name} />
                            <AvatarFallback className="bg-white/10 text-base">{creator.name[0]}</AvatarFallback>
                          </Avatar>
                          {creator.isVerified && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full gradient-bg flex items-center justify-center ring-2 ring-background" aria-label="Doğrulanmış">
                              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <h2 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors mb-0.5 truncate">
                          {creator.name}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-3">@{creator.username}</p>

                        <p className="text-sm text-muted-foreground/90 line-clamp-2 mb-5 min-h-[2.5rem]">
                          {creator.bio}
                        </p>

                        <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="text-white font-medium tabular-nums">{formatCompactNumber(creator.subscribers)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-white font-medium tabular-nums">{creator.rating.toFixed(1)}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-orange-400 font-semibold tabular-nums">
                              ${(creator.subscriptionPriceCents / 100).toFixed(0)}
                            </span>
                            <span className="text-xs text-muted-foreground">/ay</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center max-w-xl mx-auto">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Sonuç bulunamadı</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  {searchQuery
                    ? `"${searchQuery}" için yaratıcı bulunamadı. Arama terimini değiştirip tekrar deneyin.`
                    : "Henüz yaratıcı kaydı yok. Sen ilk olmak ister misin?"}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  {searchQuery && (
                    <Link href="/creators">
                      <Button variant="outline" className="border-white/15 hover:bg-white/5">Aramayı temizle</Button>
                    </Link>
                  )}
                  <Link href="/become-creator">
                    <Button className="gradient-bg text-white border-0 shadow-lg shadow-orange-500/25">Yaratıcı Ol</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
