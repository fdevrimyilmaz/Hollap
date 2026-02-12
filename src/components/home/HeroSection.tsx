"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { creators, stats } from "@/lib/data";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px] animate-pulse animation-delay-500" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">12,500+ aktif yaratici</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-6 animate-fade-in-up animation-delay-100">
              Bilgini Paylas,{" "}
              <span className="gradient-text">Gelir Elde Et</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 animate-fade-in-up animation-delay-200">
              Uzmanlik alaninda kurslar olustur, ozel icerikler paylas ve global bir kitleye ulas.
              Tutkunu kariyerine donustur.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-fade-in-up animation-delay-300">
              <Link href="/explore">
                <Button size="lg" className="gradient-bg hover:opacity-90 text-white border-0 shadow-lg shadow-orange-500/25 px-8 h-14 text-base w-full sm:w-auto">
                  Kesfetmeye Basla
                  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <Link href="/become-creator">
                <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 h-14 text-base w-full sm:w-auto">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Yaratici Ol
                </Button>
              </Link>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start animate-fade-in-up animation-delay-400">
              <div className="flex -space-x-3">
                {creators.slice(0, 5).map((creator) => (
                  <Avatar key={creator.id} className="w-10 h-10 border-2 border-background">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback>{creator.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
                <div className="w-10 h-10 rounded-full bg-orange-500/20 border-2 border-background flex items-center justify-center text-xs font-medium text-orange-500">
                  +12K
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="text-white font-semibold">2.5M+</span> ogrenci mutlu
              </div>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="relative hidden lg:block">
            {/* Main Card */}
            <div className="relative glass-card rounded-3xl p-6 animate-fade-in-up animation-delay-200">
              <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg animate-float">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              {/* Featured Creator */}
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="w-16 h-16 ring-2 ring-orange-500/50">
                  <AvatarImage src={creators[0].avatar} alt={creators[0].name} />
                  <AvatarFallback>{creators[0].name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{creators[0].name}</h3>
                    <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">{creators[0].category}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-xl bg-white/5">
                  <p className="text-2xl font-bold text-white">{creators[0].courses}</p>
                  <p className="text-xs text-muted-foreground">Kurs</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5">
                  <p className="text-2xl font-bold text-white">8.3K</p>
                  <p className="text-xs text-muted-foreground">Abone</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-white/5">
                  <p className="text-2xl font-bold gradient-text">${creators[0].totalEarnings}</p>
                  <p className="text-xs text-muted-foreground">Kazanc</p>
                </div>
              </div>

              {/* Course Preview */}
              <div className="relative h-40 rounded-xl overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=300&fit=crop"
                  alt="Course preview"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                  <div>
                    <p className="text-white font-medium">React & Next.js Egitimi</p>
                    <p className="text-sm text-muted-foreground">12,450 ogrenci</p>
                  </div>
                </div>
                <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full gradient-bg flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Floating Stats Cards */}
            <div className="absolute -left-8 top-1/4 glass-card rounded-2xl p-4 animate-float animation-delay-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">+127%</p>
                  <p className="text-xs text-muted-foreground">Bu ay</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 bottom-1/4 glass-card rounded-2xl p-4 animate-float animation-delay-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">4.9/5</p>
                  <p className="text-xs text-muted-foreground">Ortalama</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in-up animation-delay-500">
          {[
            { label: "Yaratici", value: stats.totalCreators, icon: "users" },
            { label: "Kurs", value: stats.totalCourses, icon: "book" },
            { label: "Ogrenci", value: stats.totalStudents, icon: "graduation" },
            { label: "Kazanilan", value: stats.totalEarnings, icon: "money" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-6 text-center card-hover">
              <p className="text-3xl sm:text-4xl font-bold gradient-text mb-2">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
