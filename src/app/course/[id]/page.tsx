"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { VideoPlayer } from "@/components/VideoPlayer";
import { courses, formatNumber } from "@/lib/data";

const curriculum = [
  { title: "Giris ve Kurulum", lessons: 5, duration: "45 dk" },
  { title: "Temel Kavramlar", lessons: 8, duration: "1.5 saat" },
  { title: "Ileri Seviye Konular", lessons: 12, duration: "3 saat" },
  { title: "Proje Gelistirme", lessons: 10, duration: "4 saat" },
  { title: "Deployment ve Optimizasyon", lessons: 6, duration: "2 saat" },
];

type LessonId = "l1" | "l2" | "l3" | "l4" | "l5";

const lessonChecklist: { id: LessonId; title: string; duration: string }[] = [
  { id: "l1", title: "Ortam kurulumu ve ilk proje", duration: "18 dk" },
  { id: "l2", title: "Bilesen mimarisi", duration: "24 dk" },
  { id: "l3", title: "State management stratejileri", duration: "31 dk" },
  { id: "l4", title: "API entegrasyonu", duration: "29 dk" },
  { id: "l5", title: "Deployment checklist", duration: "22 dk" },
];

type QuestionItem = {
  id: string;
  user: string;
  text: string;
  time: string;
  upvotes: number;
};

const initialQuestions: QuestionItem[] = [
  { id: "q1", user: "ahmetdev", text: "Server Actions ile API route ne zaman tercih edilmeli?", time: "2 saat once", upvotes: 21 },
  { id: "q2", user: "zeynepui", text: "Bu kurstaki proje Vercel disinda nerede deploy edilebilir?", time: "6 saat once", upvotes: 13 },
];

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const course = courses.find((c) => c.id === id) || courses[0];
  const [lessonState, setLessonState] = useState<Record<LessonId, boolean>>({
    l1: true,
    l2: true,
    l3: false,
    l4: false,
    l5: false,
  });
  const [questions, setQuestions] = useState<QuestionItem[]>(initialQuestions);
  const [questionDraft, setQuestionDraft] = useState("");

  const completedLessons = Object.values(lessonState).filter(Boolean).length;
  const completionRate = Math.round((completedLessons / lessonChecklist.length) * 100);

  const toggleLesson = (id: LessonId) => {
    setLessonState((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const submitQuestion = (e: FormEvent) => {
    e.preventDefault();
    const text = questionDraft.trim();
    if (!text) return;

    setQuestions((prev) => [
      { id: `q-${Date.now()}`, user: "sen", text, time: "simdi", upvotes: 0 },
      ...prev,
    ]);
    setQuestionDraft("");
  };

  return (
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-24 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                  {course.category}
                </Badge>
                <Badge variant="outline" className={`border-white/10 ${
                  course.level === "Beginner" ? "text-green-500" :
                  course.level === "Intermediate" ? "text-yellow-500" : "text-red-500"
                }`}>
                  {course.level === "Beginner" ? "Baslangic" :
                   course.level === "Intermediate" ? "Orta" : "Ileri"}
                </Badge>
                {course.isFeatured && <Badge className="gradient-bg border-0">One Cikan</Badge>}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                {course.title}
              </h1>

              <p className="text-lg text-muted-foreground mb-6">
                {course.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  <span className="text-white font-medium">{course.rating}</span>
                  <span className="text-muted-foreground">({formatNumber(course.students)} ogrenci)</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {course.duration}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  {course.lessons} ders
                </div>
              </div>

              <Link href={`/creator/${course.creator.username}`} className="inline-flex items-center gap-3 glass rounded-full pl-1 pr-6 py-1 hover:bg-white/10 transition-colors">
                <Avatar className="w-10 h-10 ring-2 ring-orange-500/50">
                  <AvatarImage src={course.creator.avatar} alt={course.creator.name} />
                  <AvatarFallback>{course.creator.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{course.creator.name}</span>
                    {course.creator.isVerified && (
                      <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{course.creator.category}</span>
                </div>
              </Link>
            </div>

            <div className="lg:col-span-1">
              <div className="glass-card rounded-2xl overflow-hidden sticky top-24">
                <VideoPlayer
                  thumbnail={course.thumbnail}
                  title={course.title}
                  duration={course.duration}
                  isLocked={course.isLocked}
                  onUnlock={() => window.location.href = "/checkout"}
                />

                <div className="p-6">
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-3xl font-bold gradient-text">${course.price}</span>
                    {course.originalPrice && (
                      <>
                        <span className="text-lg text-muted-foreground line-through">${course.originalPrice}</span>
                        <Badge className="bg-green-500/20 text-green-500 border-0">
                          %{Math.round((1 - course.price / course.originalPrice) * 100)} indirim
                        </Badge>
                      </>
                    )}
                  </div>

                  <Button size="lg" className="w-full gradient-bg hover:opacity-90 text-white border-0 shadow-lg shadow-orange-500/25 h-14 text-lg mb-3">
                    Hemen Satin Al
                  </Button>

                  <Button size="lg" variant="outline" className="w-full border-white/20 hover:bg-white/5 h-12 mb-6">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    Favorilere Ekle
                  </Button>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-muted-foreground">Omur boyu erisim</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-muted-foreground">Mobil ve TV uyumluluk</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-muted-foreground">Sertifika</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-muted-foreground">30 gun iade garantisi</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Bu Kursta Neler Ogreneceksin?</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    "Modern web teknolojilerini kullanma",
                    "Profesyonel proje gelistirme",
                    "Best practice ve design patterns",
                    "Performance optimizasyonu",
                    "Deployment ve CI/CD",
                    "Test yazma ve debugging",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Kurs Icerigi</h2>
                <div className="space-y-3">
                  {curriculum.map((section, i) => (
                    <div key={i} className="glass rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-sm font-medium">
                            {i + 1}
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{section.title}</h3>
                            <p className="text-sm text-muted-foreground">{section.lessons} ders - {section.duration}</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Ogrenme Ilerlemesi</h2>
                  <Badge className="bg-blue-500/20 text-blue-500 border-0">
                    {completedLessons}/{lessonChecklist.length} ders
                  </Badge>
                </div>
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Tamamlama Orani</span>
                    <span className="text-sm text-white">%{completionRate}</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  {lessonChecklist.map((lesson) => (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => toggleLesson(lesson.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        lessonState[lesson.id] ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                            lessonState[lesson.id] ? "border-green-500 text-green-500" : "border-white/30 text-transparent"
                          }`}>
                            x
                          </span>
                          <span className="text-sm text-white">{lesson.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{lesson.duration}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Ogrenci Yorumlari</h2>
                <div className="flex items-center gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold gradient-text mb-1">{course.rating}</div>
                    <div className="flex gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className={`w-5 h-5 ${star <= Math.floor(course.rating) ? "text-yellow-500" : "text-muted-foreground"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{formatNumber(course.students)} degerlendirme</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[
                      { stars: 5, percent: 78 },
                      { stars: 4, percent: 15 },
                      { stars: 3, percent: 5 },
                      { stars: 2, percent: 1 },
                      { stars: 1, percent: 1 },
                    ].map((rating) => (
                      <div key={rating.stars} className="flex items-center gap-3">
                        <div className="flex gap-0.5 w-20">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} className={`w-3 h-3 ${star <= rating.stars ? "text-yellow-500" : "text-muted-foreground"}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <Progress value={rating.percent} className="flex-1 h-2" />
                        <span className="text-sm text-muted-foreground w-10">{rating.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Soru-Cevap</h2>
                <form onSubmit={submitQuestion} className="space-y-3 mb-6">
                  <Textarea
                    value={questionDraft}
                    onChange={(e) => setQuestionDraft(e.target.value)}
                    placeholder="Kursla ilgili sorunuzu yazin..."
                    className="bg-white/5 border-white/10 min-h-[90px]"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" className="gradient-bg hover:opacity-90 text-white border-0">
                      Soru Sor
                    </Button>
                  </div>
                </form>

                <div className="space-y-3">
                  {questions.map((question) => (
                    <div key={question.id} className="rounded-xl bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-sm font-medium text-white">@{question.user}</p>
                        <span className="text-xs text-muted-foreground">{question.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{question.text}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-white/10">{question.upvotes} oy</Badge>
                        <Button size="sm" variant="outline" className="border-white/10">Yaniti Gor</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-semibold text-white mb-4">Benzer Kurslar</h3>
                  <div className="space-y-4">
                    {courses.filter((c) => c.id !== course.id).slice(0, 3).map((c) => (
                      <Link key={c.id} href={`/course/${c.id}`} className="flex gap-3 group">
                        <Image
                          src={c.thumbnail}
                          alt={c.title}
                          width={80}
                          height={56}
                          sizes="80px"
                          className="w-20 h-14 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white group-hover:text-orange-500 transition-colors line-clamp-2">{c.title}</h4>
                          <p className="text-sm text-orange-500 font-medium">${c.price}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-2xl p-6">
                  <h3 className="font-semibold text-white mb-4">Quiz ve Sertifika</h3>
                  <div className="space-y-4">
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-sm font-medium text-white mb-1">Haftalik Quiz</p>
                      <p className="text-xs text-muted-foreground">10 soru • Tahmini sure 12 dk</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-sm font-medium text-white mb-1">Proje Odevi</p>
                      <p className="text-xs text-muted-foreground">Son teslim: 5 gun icinde</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-sm font-medium text-white mb-1">Sertifika Durumu</p>
                      <p className="text-xs text-muted-foreground">%{completionRate} tamamlandi</p>
                      <Progress value={completionRate} className="h-1.5 mt-2" />
                    </div>
                    <Button className="w-full gradient-bg hover:opacity-90 text-white border-0">
                      Quizi Baslat
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
