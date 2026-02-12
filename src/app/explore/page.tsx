"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { courses, categories, formatNumber } from "@/lib/data";

const filters = ["Tumu", "Populer", "En Yeni", "En Ucuz", "En Pahali"];

export default function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState("Tumu");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
              45,000+ kurs ve icerigi ara, filtrele ve kesfet. Kariyerine yatirim yap.
            </p>

            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input placeholder="Kurs, yaratici veya kategori ara..." className="pl-12 h-14 bg-white/5 border-white/10 text-lg" />
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <aside className="lg:w-64 shrink-0">
              <div className="glass rounded-2xl p-6 sticky top-24">
                <h3 className="font-semibold text-white mb-4">Kategoriler</h3>
                <div className="space-y-2">
                  <button onClick={() => setActiveCategory(null)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${activeCategory === null ? "gradient-bg text-white" : "text-muted-foreground hover:bg-white/5"}`}>
                    Tum Kategoriler
                  </button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${activeCategory === cat.id ? "gradient-bg text-white" : "text-muted-foreground hover:bg-white/5"}`}>
                      <span>{cat.name}</span>
                      <span className="text-xs opacity-60">{cat.count}</span>
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/10 my-6" />

                <h3 className="font-semibold text-white mb-4">Seviye</h3>
                <div className="space-y-2">
                  {["Baslangic", "Orta", "Ileri"].map((level) => (
                    <label key={level} className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer hover:text-white transition-colors">
                      <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/20" />
                      {level}
                    </label>
                  ))}
                </div>

                <div className="h-px bg-white/10 my-6" />

                <h3 className="font-semibold text-white mb-4">Fiyat</h3>
                <div className="space-y-2">
                  {["Ucretsiz", "$0 - $50", "$50 - $100", "$100+"].map((price) => (
                    <label key={price} className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer hover:text-white transition-colors">
                      <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/20" />
                      {price}
                    </label>
                  ))}
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Sort Filters */}
              <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
                {filters.map((filter) => (
                  <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeFilter === filter ? "gradient-bg text-white" : "glass text-muted-foreground hover:text-white"}`}>
                    {filter}
                  </button>
                ))}
              </div>

              {/* Results */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  <span className="text-white font-medium">{courses.length}</span> sonuc bulundu
                </p>
              </div>

              {/* Course Grid */}
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Link key={course.id} href={`/course/${course.id}`} className="group">
                    <div className="glass-card rounded-2xl overflow-hidden card-hover h-full flex flex-col">
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </button>
                        {course.isFeatured && <Badge className="absolute top-3 left-3 gradient-bg border-0">One Cikan</Badge>}
                        <Badge className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm border-0">{course.duration}</Badge>
                      </div>

                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs border-white/10">{course.category}</Badge>
                        </div>
                        <h3 className="font-semibold text-white group-hover:text-orange-500 transition-colors mb-2 line-clamp-2">{course.title}</h3>

                        <div className="flex items-center gap-2 mb-3 mt-auto">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={course.creator.avatar} alt={course.creator.name} />
                            <AvatarFallback>{course.creator.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{course.creator.name}</span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            <span className="text-sm text-white">{course.rating}</span>
                            <span className="text-xs text-muted-foreground">({formatNumber(course.students)})</span>
                          </div>
                          <span className="font-bold gradient-text">${course.price}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Load More */}
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
