"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { showToast } from "@/components/ToastProvider";

type Product = {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
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

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

function LessonsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get("product");

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(initialProductId);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  // New lesson form
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [uploadingForLessonId, setUploadingForLessonId] = useState<string | null>(null);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [dragOverLessonId, setDragOverLessonId] = useState<string | null>(null);

  // Load creator's products
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (response.status === 403) {
          showToast.error("Erişim engellendi", "Bu sayfa yalnızca yaratıcılar içindir.");
          router.push("/dashboard");
          return;
        }
        if (!response.ok) throw new Error("Ürünler yüklenemedi");
        const payload = (await response.json()) as { products?: Product[] };
        setProducts(payload.products ?? []);
        if (!selectedProductId && payload.products && payload.products.length > 0) {
          setSelectedProductId(payload.products[0].id);
        }
      } catch (error) {
        showToast.error(
          "Yüklenemedi",
          error instanceof Error ? error.message : "Bilinmeyen hata",
        );
      } finally {
        setIsLoadingProducts(false);
      }
    };

    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadLessons = useCallback(async (productId: string) => {
    setIsLoadingLessons(true);
    try {
      const response = await fetch(`/api/dashboard/products/${productId}/lessons`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Dersler yüklenemedi");
      const payload = (await response.json()) as { lessons: Lesson[] };
      setLessons(payload.lessons);
    } catch (error) {
      showToast.error(
        "Dersler yüklenemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
      setLessons([]);
    } finally {
      setIsLoadingLessons(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) void loadLessons(selectedProductId);
  }, [selectedProductId, loadLessons]);

  const addLesson = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProductId) return;
    const title = newTitle.trim();
    if (!title) return;
    const duration = newDuration.trim() || "0:00";

    setIsAdding(true);
    try {
      const response = await fetch(`/api/dashboard/products/${selectedProductId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, duration }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Ders eklenemedi");
      }
      const payload = (await response.json()) as { lesson: Lesson };
      setLessons((prev) => [...prev, payload.lesson]);
      setNewTitle("");
      setNewDuration("");
      showToast.success("Ders eklendi", payload.lesson.title);
    } catch (error) {
      showToast.error(
        "Ders eklenemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const updateLesson = async (lessonId: string, patch: Partial<Lesson>) => {
    // Optimistic update
    setLessons((prev) =>
      prev.map((lesson) => (lesson.id === lessonId ? { ...lesson, ...patch } : lesson)),
    );

    try {
      const response = await fetch(`/api/dashboard/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Güncellenemedi");
      }
    } catch (error) {
      showToast.error(
        "Güncellenemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
      // Reload to revert
      if (selectedProductId) void loadLessons(selectedProductId);
    }
  };

  const persistOrder = useCallback(async (orderedIds: string[]) => {
    if (!selectedProductId) return;
    try {
      const response = await fetch(`/api/dashboard/products/${selectedProductId}/lessons/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonIds: orderedIds }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Sıra kaydedilemedi");
      }
    } catch (error) {
      showToast.error(
        "Sıra kaydedilemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
      // Reload to revert
      if (selectedProductId) void loadLessons(selectedProductId);
    }
  }, [selectedProductId, loadLessons]);

  const handleDragStart = (lessonId: string) => {
    setDraggedLessonId(lessonId);
  };

  const handleDragOver = (event: React.DragEvent, lessonId: string) => {
    event.preventDefault();
    if (draggedLessonId && draggedLessonId !== lessonId) {
      setDragOverLessonId(lessonId);
    }
  };

  const handleDragEnd = () => {
    setDraggedLessonId(null);
    setDragOverLessonId(null);
  };

  const handleDrop = (event: React.DragEvent, targetLessonId: string) => {
    event.preventDefault();
    if (!draggedLessonId || draggedLessonId === targetLessonId) {
      setDraggedLessonId(null);
      setDragOverLessonId(null);
      return;
    }

    const oldIndex = lessons.findIndex((lesson) => lesson.id === draggedLessonId);
    const newIndex = lessons.findIndex((lesson) => lesson.id === targetLessonId);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = [...lessons];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setLessons(reordered.map((lesson, index) => ({ ...lesson, sortOrder: index })));
    setDraggedLessonId(null);
    setDragOverLessonId(null);

    void persistOrder(reordered.map((lesson) => lesson.id));
  };

  const moveLesson = (lessonId: string, direction: -1 | 1) => {
    const index = lessons.findIndex((lesson) => lesson.id === lessonId);
    if (index < 0) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= lessons.length) return;

    const reordered = [...lessons];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setLessons(reordered.map((lesson, i) => ({ ...lesson, sortOrder: i })));
    void persistOrder(reordered.map((lesson) => lesson.id));
  };

  const deleteLesson = async (lessonId: string) => {
    if (!confirm("Bu dersi silmek istediğine emin misin?")) return;
    setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
    try {
      const response = await fetch(`/api/dashboard/lessons/${lessonId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Silinemedi");
      showToast.success("Ders silindi", "Müfredattan kaldırıldı");
    } catch (error) {
      showToast.error("Silinemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
      if (selectedProductId) void loadLessons(selectedProductId);
    }
  };

  const uploadVideoForLesson = async (lessonId: string, files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadingForLessonId(lessonId);
    try {
      // 1) Request upload URL + asset record
      const prepResponse = await fetch("/api/dashboard/files/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: "tum-aboneler",
          files: [{ name: file.name, size: file.size, type: file.type }],
        }),
      });

      if (!prepResponse.ok) {
        const payload = (await prepResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Yükleme hazırlanamadı");
      }

      const prepPayload = (await prepResponse.json()) as {
        uploads: Array<{
          assetId: string;
          uploadUrl: string;
          uploadMethod: string;
          uploadHeaders: Record<string, string>;
        }>;
      };
      const upload = prepPayload.uploads[0];

      // 2) PUT the file content directly
      const putResponse = await fetch(upload.uploadUrl, {
        method: upload.uploadMethod,
        headers: upload.uploadHeaders,
        body: file,
      });

      if (!putResponse.ok) {
        const detail = (await putResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(detail.error ?? `Yükleme başarısız (${putResponse.status})`);
      }

      // 3) Finalize the upload so the asset is marked uploaded and granted
      const finalizeResponse = await fetch("/api/dashboard/files/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: "tum-aboneler",
          assetIds: [upload.assetId],
        }),
      });
      if (!finalizeResponse.ok) {
        const detail = (await finalizeResponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(detail.error ?? "Yükleme sonlandırılamadı");
      }

      // 4) Persist the assetId on the lesson; signed URL is issued on watch.
      await updateLesson(lessonId, { videoAssetId: upload.assetId, videoUrl: null });
      showToast.success("Video yüklendi", `${file.name} dersle ilişkilendirildi`);
    } catch (error) {
      showToast.error(
        "Video yüklenemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setUploadingForLessonId(null);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Ders Yönetimi</h1>
            <p className="text-sm text-muted-foreground mt-1">Kursunun müfredatını oluştur, sırasını ayarla, videolarını yükle.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
            <Link href="/dashboard">← Panele Dön</Link>
          </Button>
        </div>

        {/* Product selector */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Ürün Seç</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProducts ? (
              <div className="h-12 rounded-xl shimmer" />
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz ürün yok. Önce panelden bir ürün ekle.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {products.map((product) => {
                  const isActive = product.id === selectedProductId;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProductId(product.id)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                        isActive
                          ? "gradient-bg text-white border-transparent shadow-md shadow-orange-500/25"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 text-muted-foreground hover:text-white"
                      }`}
                    >
                      {product.name}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add new lesson */}
        {selectedProduct && (
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Yeni Ders Ekle</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addLesson} className="grid sm:grid-cols-[1fr_140px_auto] gap-2">
                <Input
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  placeholder="Ders başlığı"
                  className="h-11 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl"
                />
                <Input
                  value={newDuration}
                  onChange={(event) => setNewDuration(event.target.value)}
                  placeholder="Süre (12:34)"
                  className="h-11 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl tabular-nums"
                />
                <Button
                  type="submit"
                  disabled={isAdding || !newTitle.trim()}
                  className="h-11 gradient-bg text-white border-0 shadow-md shadow-orange-500/25 font-medium disabled:opacity-50"
                >
                  {isAdding ? "Ekleniyor…" : "Ekle"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lessons list */}
        {selectedProduct && (
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white text-base">{selectedProduct.name} · Dersler</CardTitle>
              <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-muted-foreground tabular-nums">
                {lessons.length} ders
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingLessons ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl shimmer" />
                ))
              ) : lessons.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-sm text-muted-foreground">Henüz ders yok. Yukarıdaki formdan ilk dersini ekle.</p>
                </div>
              ) : (
                lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    draggable
                    onDragStart={() => handleDragStart(lesson.id)}
                    onDragOver={(event) => handleDragOver(event, lesson.id)}
                    onDragEnd={handleDragEnd}
                    onDrop={(event) => handleDrop(event, lesson.id)}
                    className={`rounded-xl bg-white/5 p-4 space-y-3 transition-all ${
                      draggedLessonId === lesson.id ? "opacity-40" : ""
                    } ${
                      dragOverLessonId === lesson.id ? "ring-2 ring-orange-500/60 bg-orange-500/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 shrink-0 mt-1">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center text-xs font-semibold tabular-nums cursor-grab active:cursor-grabbing" title="Sürükle">
                          {index + 1}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveLesson(lesson.id, -1)}
                            disabled={index === 0}
                            className="w-5 h-5 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center"
                            aria-label="Yukarı taşı"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLesson(lesson.id, 1)}
                            disabled={index === lessons.length - 1}
                            className="w-5 h-5 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center"
                            aria-label="Aşağı taşı"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 grid sm:grid-cols-[1fr_120px] gap-2">
                        <Input
                          defaultValue={lesson.title}
                          onBlur={(event) => {
                            const value = event.target.value.trim();
                            if (value && value !== lesson.title) {
                              void updateLesson(lesson.id, { title: value });
                            }
                          }}
                          className="h-9 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 text-sm rounded-lg"
                        />
                        <Input
                          defaultValue={lesson.duration}
                          onBlur={(event) => {
                            const value = event.target.value.trim();
                            if (value && value !== lesson.duration) {
                              void updateLesson(lesson.id, { duration: value });
                            }
                          }}
                          className="h-9 bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 text-sm rounded-lg tabular-nums"
                          placeholder="0:00"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap pl-10">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lesson.isPreview}
                          onChange={(event) => void updateLesson(lesson.id, { isPreview: event.target.checked })}
                          className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/30"
                        />
                        Ücretsiz önizleme
                      </label>
                      <button
                        type="button"
                        onClick={() => void deleteLesson(lesson.id)}
                        className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        Sil
                      </button>
                    </div>

                    <div className="pl-10">
                      {lesson.videoAssetId || lesson.videoUrl ? (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-xs text-emerald-300 font-medium">
                              Video {lesson.videoAssetId ? "yüklendi (özel depo)" : "URL ile bağlandı"}
                            </span>
                            {lesson.videoUrl && (
                              <a
                                href={lesson.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-emerald-400/80 hover:text-emerald-300 underline truncate"
                              >
                                Aç
                              </a>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void updateLesson(lesson.id, { videoUrl: null, videoAssetId: null })}
                            className="text-xs text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                          >
                            Kaldır
                          </button>
                        </div>
                      ) : (
                        <FileUpload
                          preset="video"
                          maxBytes={MAX_VIDEO_BYTES}
                          compact
                          isBusy={uploadingForLessonId === lesson.id}
                          onFiles={(files) => void uploadVideoForLesson(lesson.id, files)}
                          hint="MP4, WebM veya MOV · maks 500 MB"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

export default function LessonsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
        </main>
      }
    >
      <LessonsContent />
    </Suspense>
  );
}
