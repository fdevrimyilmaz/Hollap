"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { courses, formatNumber } from "@/lib/data";

export function PopularCourses() {
  return (
    <section className="py-24 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-orange-500/50 text-orange-500">
            Trend Kurslar
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            En Cok Tercih Edilen <span className="gradient-text">Kurslar</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Binlerce ogrenci tarafindan onaylanan, en yuksek puanli kurslar.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {courses.map((course) => (
            <Link key={course.id} href={`/course/${course.id}`} className="group">
              <div className="glass-card rounded-2xl overflow-hidden card-hover h-full flex flex-col">
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                  <div className="absolute top-3 left-3 flex gap-2">
                    {course.isFeatured && <Badge className="gradient-bg border-0">One Cikan</Badge>}
                    {course.isLocked && (
                      <Badge className="bg-black/50 backdrop-blur-sm border-0">
                        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Premium
                      </Badge>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <Badge className="bg-black/70 backdrop-blur-sm border-0">{course.duration}</Badge>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className="text-xs border-white/10">{course.category}</Badge>
                    <Badge variant="outline" className={`text-xs border-white/10 ${course.level === "Beginner" ? "text-green-500" : course.level === "Intermediate" ? "text-yellow-500" : "text-red-500"}`}>
                      {course.level === "Beginner" ? "Baslangic" : course.level === "Intermediate" ? "Orta" : "Ileri"}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-semibold text-white group-hover:text-orange-500 transition-colors mb-2 line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{course.description}</p>

                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={course.creator.avatar} alt={course.creator.name} />
                      <AvatarFallback>{course.creator.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{course.creator.name}</span>
                    {course.creator.isVerified && (
                      <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        <span className="text-sm font-medium text-white">{course.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        <span className="text-sm">{formatNumber(course.students)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {course.originalPrice && <span className="text-sm text-muted-foreground line-through mr-2">${course.originalPrice}</span>}
                      <span className="text-lg font-bold gradient-text">${course.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link href="/courses">
            <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
              Tum Kurslari Gor
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
