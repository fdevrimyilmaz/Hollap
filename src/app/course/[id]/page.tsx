"use client";

import { use, useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { VideoPlayer } from "@/components/VideoPlayer";
import { showToast } from "@/components/ToastProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { CourseReviews } from "@/components/course/CourseReviews";
import { BookmarkButton } from "@/components/course/BookmarkButton";

type Lesson = {
  id: string;
  title: string;
  duration: string;
  videoUrl: string | null;
  isPreview: boolean;
  sortOrder: number;
};

type QuestionItem = {
  id: string;
  user: string;
  text: string;
  createdAt: string;
  upvotes: number;
};

type MarketplaceProduct = {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorSlug: string;
  creatorProfilePath: string;
  creatorAvatar: string;
  name: string;
  description: string;
  amountCents: number;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  rating: number;
  students: number;
  isFeatured: boolean;
  thumbnail: string;
};

const FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop";

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const checkoutProductId = useMemo(() => (id.startsWith("prd-") ? id : `prd-${id}`), [id]);
  const [marketplaceProduct, setMarketplaceProduct] = useState<MarketplaceProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<MarketplaceProduct[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLessonsLoading, setIsLessonsLoading] = useState(true);
  const [lessonState, setLessonState] = useState<Record<string, boolean>>({});
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [questionDraft, setQuestionDraft] = useState("");
  const [isQuestionLoading, setIsQuestionLoading] = useState(true);

  const fallbackProduct = useMemo<MarketplaceProduct>(
    () => ({
      id: checkoutProductId,
      creatorId: "",
      creatorName: "Hollap Creator",
      creatorSlug: "",
      creatorProfilePath: "/creators",
      creatorAvatar: "",
      name: "Ürün yükleniyor",
      description: "Seçili ürün bilgileri yükleniyor.",
      amountCents: 0,
      category: "Marketplace",
      level: "Beginner",
      duration: "4 saat",
      rating: 4.5,
      students: 0,
      isFeatured: false,
      thumbnail: FALLBACK_THUMBNAIL,
    }),
    [checkoutProductId]
  );

  useEffect(() => {
    let ignore = false;

    const loadProduct = async () => {
      const fetchProduct = async (productId: string): Promise<MarketplaceProduct | null> => {
        const response = await fetch(`/api/payments/products/${encodeURIComponent(productId)}`, {
          cache: "no-store",
        });
        if (!response.ok) return null;
        const payload = (await response.json()) as { product?: MarketplaceProduct };
        return payload.product ?? null;
      };

      try {
        const byCheckoutId = await fetchProduct(checkoutProductId);
        const resolved = byCheckoutId ?? (checkoutProductId !== id ? await fetchProduct(id) : null);
        if (!ignore) setMarketplaceProduct(resolved);
      } catch {
        if (!ignore) setMarketplaceProduct(null);
      }
    };

    void loadProduct();
    return () => {
      ignore = true;
    };
  }, [checkoutProductId, id]);

  useEffect(() => {
    let ignore = false;

    const loadRelatedProducts = async () => {
      try {
        const response = await fetch("/api/payments/products", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { products?: MarketplaceProduct[] };
        const filtered = (payload.products ?? [])
          .filter((product) => product.id !== checkoutProductId && product.id !== id)
          .slice(0, 3);
        if (!ignore) setRelatedProducts(filtered);
      } catch {
        if (!ignore) setRelatedProducts([]);
      }
    };

    void loadRelatedProducts();
    return () => {
      ignore = true;
    };
  }, [checkoutProductId, id]);

  // Fetch lessons for this product
  useEffect(() => {
    let ignore = false;
    setIsLessonsLoading(true);

    const targetId = marketplaceProduct?.id ?? checkoutProductId;

    const loadLessons = async () => {
      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(targetId)}/lessons`, {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!ignore) setLessons([]);
          return;
        }
        const payload = (await response.json()) as { lessons?: Lesson[] };
        if (!ignore) setLessons(payload.lessons ?? []);
      } catch {
        if (!ignore) setLessons([]);
      } finally {
        if (!ignore) setIsLessonsLoading(false);
      }
    };

    void loadLessons();
    return () => {
      ignore = true;
    };
  }, [checkoutProductId, marketplaceProduct?.id]);

  // Load user progress (requires lessons to be loaded first to merge keys)
  useEffect(() => {
    if (lessons.length === 0) return;
    let ignore = false;

    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(id)}/progress`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { progress?: Record<string, boolean> };
        if (!payload.progress || ignore) return;
        setLessonState((prev) => {
          const next: Record<string, boolean> = { ...prev };
          for (const lesson of lessons) {
            const persisted = payload.progress?.[lesson.id];
            if (typeof persisted === "boolean") next[lesson.id] = persisted;
          }
          return next;
        });
      } catch {
        // noop
      }
    };

    void loadProgress();
    return () => {
      ignore = true;
    };
  }, [id, lessons]);

  useEffect(() => {
    let ignore = false;

    const loadQuestions = async () => {
      setIsQuestionLoading(true);
      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(id)}/questions`, { cache: "no-store" });
        if (!response.ok) throw new Error("Soru listesi yüklenemedi");
        const payload = (await response.json()) as { questions?: QuestionItem[] };
        if (!ignore) setQuestions(payload.questions ?? []);
      } catch (error) {
        if (!ignore) {
          showToast.error("Soru–Cevap yüklenemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
        }
      } finally {
        if (!ignore) setIsQuestionLoading(false);
      }
    };

    void loadQuestions();
    return () => {
      ignore = true;
    };
  }, [id]);

  const product = marketplaceProduct ?? fallbackProduct;
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((lesson) => lessonState[lesson.id]).length;
  const completionRate = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  const creatorPath =
    product.creatorProfilePath ||
    (product.creatorSlug ? `/creator/${product.creatorSlug}` : product.creatorId ? `/creator/${product.creatorId}` : "/creators");

  const toggleLesson = (lessonId: string) => {
    const completed = !lessonState[lessonId];
    setLessonState((prev) => ({ ...prev, [lessonId]: completed }));

    void (async () => {
      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(id)}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, completed }),
        });
        if (response.status === 401 || response.status === 403) return;
        if (!response.ok) throw new Error("İlerleme kaydedilemedi");
      } catch (error) {
        showToast.warning("İlerleme kaydedilemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
      }
    })();
  };

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    const text = questionDraft.trim();
    if (!text) return;

    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(id)}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.status === 401 || response.status === 403) {
        showToast.warning("Giriş gerekli", "Soru sormak için önce giriş yapmalısın");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Soru gönderilemedi");
      }

      const payload = (await response.json()) as { question?: QuestionItem };
      if (payload.question) setQuestions((prev) => [payload.question as QuestionItem, ...prev]);
      setQuestionDraft("");
    } catch (error) {
      showToast.error("Soru gönderilemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
    }
  };

  const goToCheckout = () => {
    const targetProductId = marketplaceProduct?.id ?? checkoutProductId;
    window.location.href = `/checkout?productId=${encodeURIComponent(targetProductId)}`;
  };

  const levelLabel: Record<string, string> = {
    Beginner: "Başlangıç",
    Intermediate: "Orta",
    Advanced: "İleri",
  };

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="pt-28 lg:pt-32 pb-10">
          <div className="container mx-auto px-4 grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
                  {product.category}
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-muted-foreground font-medium">
                  {levelLabel[product.level] ?? product.level}
                </Badge>
                {product.isFeatured && (
                  <Badge className="gradient-bg border-0 text-white font-semibold shadow-md shadow-orange-500/30">
                    Öne Çıkan
                  </Badge>
                )}
              </div>

              <h1 className="text-balance text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-4 tracking-tight leading-[1.1]">
                {product.name}
              </h1>
              <p className="text-pretty text-muted-foreground mb-6 leading-relaxed">{product.description}</p>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground mb-6">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-white font-medium tabular-nums">{product.rating.toFixed(1)}</span> puan
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-white font-medium tabular-nums">{formatNumber(product.students)}</span> öğrenci
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {product.duration}
                </span>
              </div>

              <Link href={creatorPath} className="inline-flex items-center gap-3 glass rounded-full pl-1 pr-5 py-1 hover:bg-white/10 transition-colors">
                <Avatar className="w-9 h-9 ring-2 ring-orange-500/40">
                  {product.creatorAvatar ? <AvatarImage src={product.creatorAvatar} alt={product.creatorName} /> : null}
                  <AvatarFallback className="bg-white/10 text-sm">{product.creatorName[0] ?? "H"}</AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-medium">{product.creatorName}</span>
              </Link>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden lg:sticky lg:top-24 h-fit shadow-2xl shadow-black/40">
              <VideoPlayer
                thumbnail={product.thumbnail}
                title={product.name}
                duration={product.duration}
                isLocked={product.amountCents > 0}
                onUnlock={goToCheckout}
              />
              <div className="p-6 space-y-4">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-display font-bold text-white tabular-nums">${(product.amountCents / 100).toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">tek seferlik</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={goToCheckout} className="flex-1 h-12 gradient-bg text-white border-0 shadow-lg shadow-orange-500/30 font-medium">
                    Hemen Satın Al
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                  <BookmarkButton productId={product.id} />
                </div>
                <p className="text-xs text-center text-muted-foreground">Güvenli ödeme · Stripe altyapısı</p>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-20">
          <div className="container mx-auto px-4 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card rounded-2xl p-6 lg:p-7">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-display font-semibold text-white tracking-tight">Müfredat</h2>
                  {totalLessons > 0 && (
                    <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/20 font-medium tabular-nums">
                      {completedLessons}/{totalLessons} ders
                    </Badge>
                  )}
                </div>

                {totalLessons > 0 && (
                  <div className="mb-5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Tamamlama oranı</span>
                      <span className="text-white tabular-nums font-medium">%{completionRate}</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                    {completionRate === 100 && (
                      <Link
                        href={`/certificate/${product.id}`}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-sm text-amber-300 hover:bg-amber-500/15 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Sertifikamı Al
                      </Link>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {isLessonsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-xl shimmer" />
                    ))
                  ) : lessons.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                        <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-sm text-muted-foreground">Bu ürün için henüz müfredat eklenmemiş</p>
                    </div>
                  ) : (
                    lessons.map((lesson, index) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => toggleLesson(lesson.id)}
                        className={`w-full rounded-xl border p-3.5 text-left transition-all flex items-center gap-3 ${
                          lessonState[lesson.id]
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          lessonState[lesson.id] ? "bg-emerald-500 text-white" : "bg-white/10 text-muted-foreground"
                        }`}>
                          {lessonState[lesson.id] ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <span className="text-xs font-semibold tabular-nums">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between min-w-0 gap-3">
                          <div className="min-w-0 flex-1">
                            <span className={`text-sm font-medium block truncate ${lessonState[lesson.id] ? "text-emerald-200" : "text-white"}`}>
                              {lesson.title}
                            </span>
                            {lesson.isPreview && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-400 mt-0.5 inline-block">
                                Önizleme
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{lesson.duration}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 lg:p-7">
                <h2 className="text-xl font-display font-semibold text-white mb-5 tracking-tight">Soru–Cevap</h2>
                <form onSubmit={submitQuestion} className="space-y-3 mb-6">
                  <Textarea
                    value={questionDraft}
                    onChange={(event) => setQuestionDraft(event.target.value)}
                    placeholder="Kursla ilgili sorunuzu buraya yazın…"
                    className="bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl min-h-[100px] resize-y"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={!questionDraft.trim()} className="gradient-bg text-white border-0 shadow-md shadow-orange-500/25 font-medium disabled:opacity-50">
                      Soru Sor
                    </Button>
                  </div>
                </form>

                <div className="space-y-3">
                  {isQuestionLoading && (
                    <div className="rounded-xl bg-white/5 p-4 text-sm text-muted-foreground flex items-center gap-2.5">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                      </svg>
                      Sorular yükleniyor…
                    </div>
                  )}
                  {!isQuestionLoading && questions.length === 0 && (
                    <div className="rounded-xl bg-white/5 p-6 text-sm text-muted-foreground text-center">
                      Henüz soru yok. İlk soruyu sen sorabilirsin.
                    </div>
                  )}
                  {questions.map((question) => (
                    <article key={question.id} className="rounded-xl bg-white/[0.04] border border-white/5 p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-semibold text-white">@{question.user}</p>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(question.createdAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{question.text}</p>
                      <Badge variant="outline" className="border-white/10 text-xs tabular-nums">
                        ↑ {question.upvotes} oy
                      </Badge>
                    </article>
                  ))}
                </div>
              </div>

              <CourseReviews productId={product.id} />
            </div>

            <aside className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-base font-display font-semibold text-white mb-4 tracking-tight">Benzer kurslar</h3>
                <div className="space-y-3">
                  {relatedProducts.length > 0 ? (
                    relatedProducts.map((related) => (
                      <Link key={related.id} href={`/course/${related.id}`} className="flex gap-3 group hover:bg-white/[0.04] -mx-2 px-2 py-2 rounded-lg transition-colors">
                        <Image
                          src={related.thumbnail}
                          alt=""
                          width={80}
                          height={56}
                          sizes="80px"
                          className="w-20 h-14 object-cover rounded-lg shrink-0 ring-1 ring-white/5"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm text-white group-hover:text-orange-400 line-clamp-2 font-medium leading-snug transition-colors">
                            {related.name}
                          </h4>
                          <p className="text-sm text-orange-400 mt-0.5 tabular-nums font-semibold">
                            ${(related.amountCents / 100).toFixed(0)}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Benzer ürün bulunamadı.</p>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
