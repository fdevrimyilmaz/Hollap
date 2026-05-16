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

const filters = ["Tumu", "Populer", "En Yeni", "En Ucuz", "En Pahali"];
const categories = ["Tumu", "Marketplace"];

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

function ExplorePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q")?.trim() ?? "";

  const [activeFilter, setActiveFilter] = useState("Tumu");
  const [activeCategory, setActiveCategory] = useState("Tumu");
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
          throw new Error("Urunler yuklenemedi");
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

  const filteredProducts = useMemo(() => {
    let next = [...products];

    if (activeCategory !== "Tumu") {
      next = next.filter((product) => product.category === activeCategory);
    }

    if (activeFilter === "Populer") {
      next.sort((a, b) => b.sold - a.sold);
    } else if (activeFilter === "En Ucuz") {
      next.sort((a, b) => a.amountCents - b.amountCents);
    } else if (activeFilter === "En Pahali") {
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
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-28 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Tum <span className="gradient-text">Icerikleri</span> Kesfet
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Marketplace urunlerini ara, filtrele ve hemen satin al.
            </p>

            <form onSubmit={submitSearch} className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Urun veya yaratici ara..."
                className="pl-12 h-14 bg-white/5 border-white/10 text-lg"
              />
            </form>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-64 shrink-0">
              <div className="glass rounded-2xl p-6 sticky top-24">
                <h3 className="font-semibold text-white mb-4">Kategoriler</h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                        activeCategory === category ? "gradient-bg text-white" : "text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      activeFilter === filter ? "gradient-bg text-white" : "glass text-muted-foreground hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  <span className="text-white font-medium">{filteredProducts.length}</span> sonuc bulundu
                </p>
              </div>

              {loadError && (
                <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {loadError}
                </div>
              )}

              {isLoading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="glass-card rounded-2xl h-72 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map((course) => (
                    <Link key={course.id} href={`/course/${course.id}`} className="group">
                      <div className="glass-card rounded-2xl overflow-hidden card-hover h-full flex flex-col">
                        <div className="relative aspect-video overflow-hidden">
                          <Image
                            src={course.thumbnail}
                            alt={course.name}
                            fill
                            sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          {course.isFeatured && <Badge className="absolute top-3 left-3 gradient-bg border-0">One Cikan</Badge>}
                          <Badge className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm border-0">{course.duration}</Badge>
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs border-white/10">{course.category}</Badge>
                          </div>
                          <h3 className="font-semibold text-white group-hover:text-orange-500 transition-colors mb-2 line-clamp-2">{course.name}</h3>

                          <div className="flex items-center gap-2 mb-3 mt-auto">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback>{course.creatorName[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{course.creatorName}</span>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <span className="text-sm text-white">{course.rating}</span>
                              <span className="text-xs text-muted-foreground">({formatNumber(course.students)})</span>
                            </div>
                            <span className="font-bold gradient-text">${(course.amountCents / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="text-center mt-12">
                <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
                  Daha Fazla Yukle
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<main className="min-h-screen relative" />}>
      <ExplorePageContent />
    </Suspense>
  );
}
