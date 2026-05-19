"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type ExploreProduct = {
  id: string;
  creatorId: string;
  creatorName: string;
  name: string;
  description: string;
  amountCents: number;
  stock: number;
  sold: number;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  rating: number;
  students: number;
  isFeatured: boolean;
  thumbnail: string;
};

const filters = [
  { id: "all", label: "Tümü" },
  { id: "popular", label: "Popüler" },
  { id: "newest", label: "En Yeni" },
  { id: "cheapest", label: "En Ucuz" },
  { id: "expensive", label: "En Pahalı" },
];

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

function ExplorePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q")?.trim() ?? "";

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchDraft, setSearchDraft] = useState(queryFromUrl);
  const [products, setProducts] = useState<ExploreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setSearchDraft(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    let ignore = false;

    const fetchProducts = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const params = new URLSearchParams();
        if (queryFromUrl.length > 0) {
          params.set("q", queryFromUrl);
        }

        const response = await fetch(`/api/payments/products${params.toString() ? `?${params.toString()}` : ""}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Ürünler yüklenemedi");
        }

        const payload = (await response.json()) as { products?: ExploreProduct[] };
        if (!ignore) {
          setProducts(payload.products ?? []);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(error instanceof Error ? error.message : "Bilinmeyen hata");
          setProducts([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      ignore = true;
    };
  }, [queryFromUrl]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((product) => {
      map.set(product.category, (map.get(product.category) ?? 0) + 1);
    });
    return [
      { id: "all", label: "Tümü", count: products.length },
      ...Array.from(map.entries()).map(([label, count]) => ({ id: label, label, count })),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let next = [...products];

    if (activeCategory !== "all") {
      next = next.filter((product) => product.category === activeCategory);
    }

    if (activeFilter === "popular") {
      next.sort((a, b) => b.sold - a.sold);
    } else if (activeFilter === "cheapest") {
      next.sort((a, b) => a.amountCents - b.amountCents);
    } else if (activeFilter === "expensive") {
      next.sort((a, b) => b.amountCents - a.amountCents);
    }

    return next;
  }, [products, activeCategory, activeFilter]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const nextQuery = searchDraft.trim();
    router.push(nextQuery.length ? `/explore?q=${encodeURIComponent(nextQuery)}` : "/explore");
  };

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="relative pt-28 lg:pt-32 pb-10 overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-50" aria-hidden="true" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl">
              <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
                Keşfet
              </Badge>
              <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-4 tracking-tight leading-[1.05]">
                Tüm <span className="gradient-text">içerikleri</span> keşfet
              </h1>
              <p className="text-pretty text-lg text-muted-foreground mb-8 leading-relaxed">
                Marketplace ürünlerini ara, filtrele ve hemen satın al.
              </p>

              <form onSubmit={submitSearch} className="relative" role="search">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Ürün veya yaratıcı ara…"
                  aria-label="İçerik ara"
                  className="pl-12 pr-28 h-14 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 text-base rounded-2xl"
                />
                <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 gradient-bg text-white border-0 h-10 px-4 font-medium">
                  Ara
                </Button>
              </form>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <aside className="lg:w-64 shrink-0">
                <div className="glass-card rounded-2xl p-5 lg:sticky lg:top-24">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Kategoriler</h3>
                  <div className="space-y-1">
                    {categoryOptions.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                          activeCategory === category.id
                            ? "bg-orange-500/15 text-orange-400 font-medium"
                            : "text-muted-foreground hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span>{category.label}</span>
                        <span className={`text-xs tabular-nums ${activeCategory === category.id ? "text-orange-400/70" : "text-muted-foreground/60"}`}>
                          {category.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setActiveFilter(filter.id)}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                        activeFilter === filter.id
                          ? "gradient-bg text-white border-transparent shadow-md shadow-orange-500/20"
                          : "glass text-muted-foreground hover:text-white border-white/10"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-6 text-sm">
                  <p className="text-muted-foreground">
                    <span className="text-white font-semibold tabular-nums">{filteredProducts.length}</span> sonuç bulundu
                  </p>
                </div>

                {loadError && (
                  <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300 flex items-start gap-2.5">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{loadError}</span>
                  </div>
                )}

                {isLoading ? (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="glass-card rounded-2xl overflow-hidden">
                        <div className="aspect-video shimmer" />
                        <div className="p-5 space-y-3">
                          <div className="h-3 w-20 rounded shimmer" />
                          <div className="h-4 w-full rounded shimmer" />
                          <div className="h-4 w-2/3 rounded shimmer" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length > 0 ? (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredProducts.map((course) => {
                      const level = levelLabel[course.level] ?? { label: course.level, classes: "text-muted-foreground border-white/10 bg-white/5" };
                      return (
                        <Link key={course.id} href={`/course/${course.id}`} className="group block">
                          <article className="glass-card rounded-2xl overflow-hidden card-hover h-full flex flex-col">
                            <div className="relative aspect-video overflow-hidden">
                              <Image
                                src={course.thumbnail}
                                alt=""
                                fill
                                sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                              {course.isFeatured && (
                                <Badge className="absolute top-3 left-3 gradient-bg border-0 text-white font-semibold shadow-md shadow-orange-500/30">
                                  Öne Çıkan
                                </Badge>
                              )}
                              <Badge className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 text-white font-medium">
                                {course.duration}
                              </Badge>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline" className="text-xs border-white/10 bg-white/[0.03] text-muted-foreground">{course.category}</Badge>
                                <Badge variant="outline" className={`text-xs font-medium ${level.classes}`}>
                                  {level.label}
                                </Badge>
                              </div>
                              <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors mb-2 line-clamp-2 leading-snug">{course.name}</h3>

                              <div className="flex items-center gap-2 mb-3 mt-auto">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-[10px] bg-white/10">{course.creatorName[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate">{course.creatorName}</span>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <div className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span className="text-sm font-medium text-white tabular-nums">{course.rating.toFixed(1)}</span>
                                  <span className="text-xs text-muted-foreground tabular-nums">({formatNumber(course.students)})</span>
                                </div>
                                <span className="text-base font-display font-bold text-white tabular-nums">
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
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                      <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Sonuç bulunamadı</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
                      Arama veya filtreleri değiştirip tekrar deneyebilirsin.
                    </p>
                    <Button
                      variant="outline"
                      className="border-white/15 hover:bg-white/5"
                      onClick={() => {
                        setActiveCategory("all");
                        setActiveFilter("all");
                        setSearchDraft("");
                        router.push("/explore");
                      }}
                    >
                      Filtreleri temizle
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<main className="min-h-screen relative" />}>
      <ExplorePageContent />
    </Suspense>
  );
}
