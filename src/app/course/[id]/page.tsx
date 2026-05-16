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

type LessonId = "l1" | "l2" | "l3" | "l4" | "l5";

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

const lessonChecklist: { id: LessonId; title: string; duration: string }[] = [
  { id: "l1", title: "Ortam kurulumu ve ilk proje", duration: "18 dk" },
  { id: "l2", title: "Bilesen mimarisi", duration: "24 dk" },
  { id: "l3", title: "State management stratejileri", duration: "31 dk" },
  { id: "l4", title: "API entegrasyonu", duration: "29 dk" },
  { id: "l5", title: "Deployment checklist", duration: "22 dk" },
];

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
  if (minutes < 1) return "simdi";
  if (minutes < 60) return `${minutes} dk once`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat once`;
  return `${Math.floor(hours / 24)} gun once`;
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const checkoutProductId = useMemo(() => (id.startsWith("prd-") ? id : `prd-${id}`), [id]);
  const [marketplaceProduct, setMarketplaceProduct] = useState<MarketplaceProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<MarketplaceProduct[]>([]);
  const [lessonState, setLessonState] = useState<Record<LessonId, boolean>>({
    l1: true,
    l2: true,
    l3: false,
    l4: false,
    l5: false,
  });
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
      name: "Urun yukleniyor",
      description: "Secili urun bilgileri yukleniyor.",
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

  useEffect(() => {
    let ignore = false;

    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(id)}/progress`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { progress?: Record<string, boolean> };
        if (!payload.progress || ignore) return;
        setLessonState((prev) => {
          const next = { ...prev };
          for (const lesson of lessonChecklist) {
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
  }, [id]);

  useEffect(() => {
    let ignore = false;

    const loadQuestions = async () => {
      setIsQuestionLoading(true);
      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(id)}/questions`, { cache: "no-store" });
        if (!response.ok) throw new Error("Soru listesi yuklenemedi");
        const payload = (await response.json()) as { questions?: QuestionItem[] };
        if (!ignore) setQuestions(payload.questions ?? []);
      } catch (error) {
        if (!ignore) {
          showToast.error("Soru-Cevap yuklenemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
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
  const completedLessons = Object.values(lessonState).filter(Boolean).length;
  const completionRate = Math.round((completedLessons / lessonChecklist.length) * 100);
  const creatorPath =
    product.creatorProfilePath ||
    (product.creatorSlug ? `/creator/${product.creatorSlug}` : product.creatorId ? `/creator/${product.creatorId}` : "/creators");

  const toggleLesson = (lessonId: LessonId) => {
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
        if (!response.ok) throw new Error("Ilerleme kaydedilemedi");
      } catch (error) {
        showToast.warning("Ilerleme kaydedilemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
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
        showToast.warning("Giris gerekli", "Soru sormak icin once giris yapmalisin");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Soru gonderilemedi");
      }

      const payload = (await response.json()) as { question?: QuestionItem };
      if (payload.question) setQuestions((prev) => [payload.question as QuestionItem, ...prev]);
      setQuestionDraft("");
    } catch (error) {
      showToast.error("Soru gonderilemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
    }
  };

  const goToCheckout = () => {
    const targetProductId = marketplaceProduct?.id ?? checkoutProductId;
    window.location.href = `/checkout?productId=${encodeURIComponent(targetProductId)}`;
  };

  return (
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-24 pb-10">
        <div className="container mx-auto px-4 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="border-orange-500/50 text-orange-500">{product.category}</Badge>
              <Badge variant="outline" className="border-white/10">{product.level}</Badge>
              {product.isFeatured && <Badge className="gradient-bg border-0">One Cikan</Badge>}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{product.name}</h1>
            <p className="text-muted-foreground mb-5">{product.description}</p>

            <div className="flex flex-wrap gap-5 text-sm text-muted-foreground mb-6">
              <span>{product.rating} puan</span>
              <span>{formatNumber(product.students)} ogrenci</span>
              <span>{product.duration}</span>
            </div>

            <Link href={creatorPath} className="inline-flex items-center gap-3 glass rounded-full pl-1 pr-5 py-1">
              <Avatar className="w-10 h-10 ring-2 ring-orange-500/50">
                {product.creatorAvatar ? <AvatarImage src={product.creatorAvatar} alt={product.creatorName} /> : null}
                <AvatarFallback>{product.creatorName[0] ?? "H"}</AvatarFallback>
              </Avatar>
              <span className="text-white">{product.creatorName}</span>
            </Link>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden sticky top-24 h-fit">
            <VideoPlayer
              thumbnail={product.thumbnail}
              title={product.name}
              duration={product.duration}
              isLocked={product.amountCents > 0}
              onUnlock={goToCheckout}
            />
            <div className="p-6 space-y-4">
              <p className="text-3xl font-bold gradient-text">${(product.amountCents / 100).toFixed(2)}</p>
              <Button onClick={goToCheckout} className="w-full gradient-bg text-white border-0">Hemen Satin Al</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Ogrenme Ilerlemesi</h2>
                <Badge className="bg-blue-500/20 text-blue-500 border-0">{completedLessons}/{lessonChecklist.length} ders</Badge>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Tamamlama Orani</span>
                  <span className="text-white">%{completionRate}</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
              <div className="space-y-2">
                {lessonChecklist.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => toggleLesson(lesson.id)}
                    className={`w-full rounded-xl border p-3 text-left ${
                      lessonState[lesson.id] ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">{lesson.title}</span>
                      <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Soru-Cevap</h2>
              <form onSubmit={submitQuestion} className="space-y-3 mb-5">
                <Textarea
                  value={questionDraft}
                  onChange={(event) => setQuestionDraft(event.target.value)}
                  placeholder="Kursla ilgili sorunuzu yazin..."
                  className="bg-white/5 border-white/10 min-h-[90px]"
                />
                <div className="flex justify-end">
                  <Button type="submit" className="gradient-bg text-white border-0">Soru Sor</Button>
                </div>
              </form>

              <div className="space-y-3">
                {isQuestionLoading && <div className="rounded-xl bg-white/5 p-4 text-sm text-muted-foreground">Sorular yukleniyor...</div>}
                {!isQuestionLoading && questions.length === 0 && <div className="rounded-xl bg-white/5 p-4 text-sm text-muted-foreground">Henuz soru yok.</div>}
                {questions.map((question) => (
                  <div key={question.id} className="rounded-xl bg-white/5 p-4">
                    <div className="flex justify-between mb-2">
                      <p className="text-sm font-medium text-white">@{question.user}</p>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(question.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{question.text}</p>
                    <Badge variant="outline" className="border-white/10">{question.upvotes} oy</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">Benzer Kurslar</h3>
              <div className="space-y-4">
                {relatedProducts.length > 0 ? (
                  relatedProducts.map((related) => (
                    <Link key={related.id} href={`/course/${related.id}`} className="flex gap-3 group">
                      <Image src={related.thumbnail} alt={related.name} width={80} height={56} sizes="80px" className="w-20 h-14 object-cover rounded-lg" />
                      <div className="min-w-0">
                        <h4 className="text-sm text-white group-hover:text-orange-500 line-clamp-2">{related.name}</h4>
                        <p className="text-sm text-orange-500">${(related.amountCents / 100).toFixed(2)}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Benzer urun bulunamadi.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
