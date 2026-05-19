"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VideoPlayer } from "@/components/VideoPlayer";

type WatchProduct = {
  id: string;
  name: string;
  thumbnail: string;
};

type Lesson = {
  id: string;
  title: string;
  duration: string;
  videoUrl: string | null;
  videoAssetId: string | null;
  isPreview: boolean;
  sortOrder: number;
};

const FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop";

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<WatchProduct>({
    id,
    name: "Kurs yükleniyor",
    thumbnail: FALLBACK_THUMBNAIL,
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLessonsLoading, setIsLessonsLoading] = useState(true);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const productId = id.startsWith("prd_") || id.startsWith("prd-") ? id : `prd_${id}`;

    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/payments/products/${encodeURIComponent(productId)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { product?: { id: string; name: string; thumbnail: string } };
        if (!ignore && payload.product) {
          setProduct({
            id: payload.product.id,
            name: payload.product.name,
            thumbnail: payload.product.thumbnail,
          });
        }
      } catch {
        if (!ignore) {
          setProduct((prev) => ({ ...prev, id: productId }));
        }
      }
    };

    void loadProduct();
    return () => {
      ignore = true;
    };
  }, [id]);

  // Load lessons from DB
  useEffect(() => {
    let ignore = false;
    setIsLessonsLoading(true);

    const targetId = product.id ?? id;

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
        if (!ignore) {
          const sorted = (payload.lessons ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
          setLessons(sorted);
          if (sorted.length > 0 && !currentLessonId) {
            setCurrentLessonId(sorted[0].id);
          }
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, id]);

  // Fetch playable video URL for current lesson
  useEffect(() => {
    if (!currentLessonId) {
      setVideoSrc(null);
      setVideoError(null);
      return;
    }
    let cancelled = false;
    setVideoSrc(null);
    setVideoError(null);
    setIsVideoLoading(true);

    const targetCourseId = product.id ?? id;

    const loadVideo = async () => {
      try {
        const response = await fetch(
          `/api/courses/${encodeURIComponent(targetCourseId)}/lessons/${encodeURIComponent(currentLessonId)}/video`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (response.status === 404) {
          setVideoSrc(null);
          setVideoError("Bu derse henüz video yüklenmemiş.");
          return;
        }
        if (response.status === 403) {
          setVideoSrc(null);
          setVideoError("Bu dersi izlemek için ürünü satın almalısın.");
          return;
        }
        if (response.status === 401) {
          setVideoSrc(null);
          setVideoError("Devam etmek için giriş yapmalısın.");
          return;
        }
        if (!response.ok) {
          setVideoSrc(null);
          setVideoError("Video yüklenemedi.");
          return;
        }
        const payload = (await response.json()) as { videoUrl: string | null };
        if (!cancelled) setVideoSrc(payload.videoUrl);
      } catch {
        if (!cancelled) setVideoError("Video yüklenemedi.");
      } finally {
        if (!cancelled) setIsVideoLoading(false);
      }
    };

    void loadVideo();
    return () => {
      cancelled = true;
    };
  }, [currentLessonId, product.id, id]);

  // Load progress
  useEffect(() => {
    if (lessons.length === 0) return;
    let ignore = false;

    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/courses/${encodeURIComponent(id)}/progress`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { progress?: Record<string, boolean> };
        if (!payload.progress || ignore) return;
        const next = new Set<string>();
        for (const lesson of lessons) {
          if (payload.progress[lesson.id]) next.add(lesson.id);
        }
        setCompletedIds(next);
      } catch {
        // noop
      }
    };

    void loadProgress();
    return () => {
      ignore = true;
    };
  }, [id, lessons]);

  const currentLesson = lessons.find((l) => l.id === currentLessonId) ?? lessons[0] ?? null;
  const currentIndex = currentLesson ? lessons.findIndex((l) => l.id === currentLesson.id) : -1;
  const completedCount = completedIds.size;
  const progressPercent = lessons.length === 0 ? 0 : Math.round((completedCount / lessons.length) * 100);

  const goToLesson = (lessonId: string) => {
    setCurrentLessonId(lessonId);
  };

  const goPrevious = () => {
    if (currentIndex <= 0) return;
    setCurrentLessonId(lessons[currentIndex - 1].id);
  };

  const goNext = () => {
    if (currentIndex < 0 || currentIndex >= lessons.length - 1) return;
    setCurrentLessonId(lessons[currentIndex + 1].id);
  };

  const markCompleted = async () => {
    if (!currentLesson) return;
    const next = new Set(completedIds);
    next.add(currentLesson.id);
    setCompletedIds(next);

    try {
      await fetch(`/api/courses/${encodeURIComponent(id)}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: currentLesson.id, completed: true }),
      });
    } catch {
      // noop
    }

    if (currentIndex < lessons.length - 1) {
      setCurrentLessonId(lessons[currentIndex + 1].id);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-white/5 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href={`/course/${product.id}`}
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium">Kursa dön</span>
          </Link>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <h1 className="text-white font-medium truncate text-sm hidden sm:block">{product.name}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">%{progressPercent} tamamlandı</span>
            <Progress value={progressPercent} className="w-28 h-1.5" />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-white/10 hover:bg-white/5 h-9 w-9 p-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Kenar çubuğunu gizle" : "Kenar çubuğunu göster"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-black">
            <div className="max-w-6xl mx-auto relative">
              <VideoPlayer
                thumbnail={product.thumbnail}
                title={currentLesson?.title ?? product.name}
                duration={currentLesson?.duration ?? "—"}
                isLocked={false}
                src={videoSrc}
              />
              {(isVideoLoading || videoError) && (
                <div className="absolute inset-x-0 bottom-4 mx-auto w-fit max-w-md px-4 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-center pointer-events-none">
                  {isVideoLoading ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                      </svg>
                      Video yükleniyor…
                    </p>
                  ) : (
                    <p className="text-xs text-orange-300">{videoError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-b border-white/5">
            <div className="max-w-4xl">
              {currentLesson ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium tabular-nums">
                      Ders {currentIndex + 1}
                    </Badge>
                    <span className="text-sm text-muted-foreground tabular-nums">{currentLesson.duration}</span>
                    {completedIds.has(currentLesson.id) && (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                        Tamamlandı
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-5 tracking-tight">
                    {currentLesson.title}
                  </h2>

                  <div className="flex items-center flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 font-medium"
                      disabled={currentIndex <= 0}
                      onClick={goPrevious}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Önceki
                    </Button>
                    <Button
                      className="gradient-bg hover:opacity-95 text-white border-0 shadow-md shadow-orange-500/25 font-medium"
                      onClick={() => void markCompleted()}
                    >
                      {currentIndex < lessons.length - 1 ? "Tamamla ve Devam Et" : "Tamamla"}
                      <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 font-medium"
                      disabled={currentIndex < 0 || currentIndex >= lessons.length - 1}
                      onClick={goNext}
                    >
                      Sonraki
                      <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Bu kurs için henüz ders bulunmuyor.</p>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Bu Derste</h3>
              <p className="text-muted-foreground leading-relaxed">
                {currentLesson
                  ? <>Bu derste <span className="text-white font-medium">{currentLesson.title.toLowerCase()}</span> konusunu detaylı şekilde işleyeceğiz.</>
                  : "Müfredat henüz hazırlanıyor."}
              </p>
            </div>
          </div>
        </main>

        {sidebarOpen && (
          <aside className="w-80 border-l border-white/5 bg-card/50 backdrop-blur-xl shrink-0 hidden lg:block">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Kurs İçeriği</h3>
              <p className="text-sm text-white font-medium tabular-nums">
                {completedCount}/{lessons.length} ders tamamlandı
              </p>
            </div>

            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="p-2">
                {isLessonsLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 m-1 rounded-xl shimmer" />
                  ))
                ) : lessons.length === 0 ? (
                  <p className="px-3 py-6 text-sm text-muted-foreground text-center">Henüz ders yok.</p>
                ) : (
                  lessons.map((lesson, index) => {
                    const isCurrent = currentLesson?.id === lesson.id;
                    const isCompleted = completedIds.has(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => goToLesson(lesson.id)}
                        className={`w-full text-left p-3 rounded-xl mb-1 transition-all ${
                          isCurrent
                            ? "bg-orange-500/15 border border-orange-500/30"
                            : "hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-medium tabular-nums ${
                            isCompleted
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : isCurrent
                                ? "gradient-bg text-white"
                                : "bg-white/5 text-muted-foreground"
                          }`}>
                            {isCompleted ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isCurrent ? "text-orange-400" : "text-white"
                            }`}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground tabular-nums">{lesson.duration}</span>
                              {lesson.isPreview && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-white/10 border-0 font-medium">Önizleme</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  );
}
