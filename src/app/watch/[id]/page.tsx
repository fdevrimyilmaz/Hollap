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

const FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop";

const lessons = [
  { id: 1, title: "Kursa Hosgeldiniz", duration: "5:32", completed: true, isPreview: true },
  { id: 2, title: "Gelistirme Ortaminin Kurulumu", duration: "12:45", completed: true, isPreview: false },
  { id: 3, title: "Proje Yapisini Anlama", duration: "8:20", completed: true, isPreview: false },
  { id: 4, title: "Temel Kavramlar", duration: "15:10", completed: false, isPreview: false },
  { id: 5, title: "Component Yapisi", duration: "18:30", completed: false, isPreview: false },
  { id: 6, title: "State Yonetimi", duration: "22:15", completed: false, isPreview: false },
  { id: 7, title: "Props ve Data Flow", duration: "14:50", completed: false, isPreview: false },
  { id: 8, title: "Hooks Kullanimi", duration: "25:40", completed: false, isPreview: false },
  { id: 9, title: "API Entegrasyonu", duration: "19:25", completed: false, isPreview: false },
  { id: 10, title: "Deployment", duration: "10:15", completed: false, isPreview: false },
];

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<WatchProduct>({
    id,
    name: "Kurs yukleniyor",
    thumbnail: FALLBACK_THUMBNAIL,
  });
  const [currentLesson, setCurrentLesson] = useState(lessons[3]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let ignore = false;
    const productId = id.startsWith("prd-") ? id : `prd-${id}`;

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

  const completedCount = lessons.filter((lesson) => lesson.completed).length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b border-white/5 bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link href={`/course/${product.id}`} className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Kursa Don</span>
          </Link>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <h1 className="text-white font-medium truncate max-w-md hidden sm:block">{product.name}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-muted-foreground">%{progressPercent} tamamlandi</span>
            <Progress value={progressPercent} className="w-32 h-2" />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-white/10"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-black">
            <div className="max-w-6xl mx-auto">
              <VideoPlayer
                thumbnail={product.thumbnail}
                title={currentLesson.title}
                duration={currentLesson.duration}
                isLocked={false}
              />
            </div>
          </div>

          <div className="p-6 border-b border-white/5">
            <div className="max-w-4xl">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                  Ders {currentLesson.id}
                </Badge>
                <span className="text-sm text-muted-foreground">{currentLesson.duration}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">{currentLesson.title}</h2>

              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  className="border-white/10"
                  disabled={currentLesson.id === 1}
                  onClick={() => setCurrentLesson(lessons[currentLesson.id - 2])}
                >
                  Onceki
                </Button>
                <Button
                  className="gradient-bg hover:opacity-90 text-white border-0"
                  disabled={currentLesson.id === lessons.length}
                  onClick={() => setCurrentLesson(lessons[currentLesson.id])}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl">
              <h3 className="font-semibold text-white mb-3">Bu Derste</h3>
              <p className="text-muted-foreground">
                Bu derste {currentLesson.title.toLowerCase()} konusunu detayli sekilde isleyecegiz.
              </p>
            </div>
          </div>
        </main>

        {sidebarOpen && (
          <aside className="w-80 border-l border-white/5 bg-card shrink-0 hidden lg:block">
            <div className="p-4 border-b border-white/5">
              <h3 className="font-semibold text-white">Kurs Icerigi</h3>
              <p className="text-sm text-muted-foreground">{completedCount}/{lessons.length} ders tamamlandi</p>
            </div>

            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="p-2">
                {lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setCurrentLesson(lesson)}
                    className={`w-full text-left p-3 rounded-xl mb-1 transition-all ${
                      currentLesson.id === lesson.id ? "bg-orange-500/20 border border-orange-500/50" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        lesson.completed
                          ? "bg-green-500/20 text-green-500"
                          : currentLesson.id === lesson.id
                            ? "gradient-bg text-white"
                            : "bg-white/5 text-muted-foreground"
                      }`}>
                        {lesson.completed ? "x" : <span className="text-sm">{lesson.id}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          currentLesson.id === lesson.id ? "text-orange-500" : "text-white"
                        }`}>
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                          {lesson.isPreview && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-white/10 border-0">Onizleme</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  );
}
