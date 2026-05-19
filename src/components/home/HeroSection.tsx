import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getCatalogOverview, listCatalogCreators } from "@/lib/server/catalog";

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(value);
}

function formatCompactCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1).replace(".0", "")}K`;
  return `$${dollars.toFixed(0)}`;
}

export async function HeroSection() {
  const [creators, overview] = await Promise.all([
    listCatalogCreators({ limit: 5 }),
    getCatalogOverview(),
  ]);

  const topCreator = creators[0] ?? null;
  const hasCreators = overview.totalCreators > 0;
  const creatorBadge = hasCreators ? `${formatCompactNumber(overview.totalCreators)}+` : "Yeni";
  const studentBadge = overview.totalStudents > 0 ? `${formatCompactNumber(overview.totalStudents)}+` : "0";

  return (
    <section className="relative min-h-[100svh] flex items-center pt-24 pb-16 lg:pt-28 overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
      <div className="absolute top-1/4 -left-20 w-[28rem] h-[28rem] bg-orange-500/20 rounded-full blur-[140px] animate-pulse" aria-hidden="true" />
      <div className="absolute bottom-1/4 -right-10 w-[22rem] h-[22rem] bg-amber-500/15 rounded-full blur-[120px] animate-pulse animation-delay-500" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden="true" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Left column - text */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass mb-7 animate-fade-in-up">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {creatorBadge} aktif yaratıcı şu an üretiyor
              </span>
            </div>

            <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl xl:text-[4.25rem] font-display font-bold leading-[1.05] tracking-tight mb-6 animate-fade-in-up animation-delay-100">
              Bilgini Paylaş, <br className="hidden sm:inline" />
              <span className="gradient-text">Gelir Elde Et</span>
            </h1>

            <p className="text-pretty text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-9 leading-relaxed animate-fade-in-up animation-delay-200">
              Uzmanlık alanında kurslar oluştur, özel içerikler paylaş ve global bir kitleye ulaş.
              Tutkunu sürdürülebilir bir kariyere dönüştür.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-12 animate-fade-in-up animation-delay-300">
              <Link href="/explore">
                <Button
                  size="lg"
                  className="gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/30 px-7 h-12 text-base font-medium w-full sm:w-auto group"
                >
                  Keşfetmeye Başla
                  <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <Link href="/become-creator">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 h-12 text-base font-medium w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 mr-2 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Yaratıcı Ol
                </Button>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 justify-center lg:justify-start animate-fade-in-up animation-delay-400">
              <div className="flex -space-x-2.5">
                {creators.slice(0, 4).map((creator) => (
                  <Avatar key={creator.id} className="w-9 h-9 border-2 border-background ring-1 ring-white/10">
                    <AvatarImage src={creator.avatar} alt={creator.name} />
                    <AvatarFallback className="text-xs bg-white/10">{creator.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
                {hasCreators && (
                  <div className="w-9 h-9 rounded-full bg-orange-500/15 border-2 border-background flex items-center justify-center text-[11px] font-semibold text-orange-400">
                    +{creatorBadge}
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="text-white font-semibold">{studentBadge}</span> mutlu öğrenci
              </div>
            </div>
          </div>

          {/* Right column - showcase card */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-6 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent blur-2xl rounded-[2rem]" aria-hidden="true" />

            <div className="relative glass-card rounded-3xl p-6 animate-fade-in-up animation-delay-200 shadow-2xl shadow-black/40">
              <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/40 animate-float">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              {topCreator ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="w-14 h-14 ring-2 ring-orange-500/50">
                      <AvatarImage src={topCreator.avatar} alt={topCreator.name} />
                      <AvatarFallback className="bg-white/10">{topCreator.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-white truncate">{topCreator.name}</h3>
                        {topCreator.isVerified && (
                          <svg className="w-4 h-4 text-orange-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Doğrulanmış">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{topCreator.category}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/5">
                      <p className="text-xl font-bold text-white tabular-nums">{topCreator.productCount}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Ürün</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/5">
                      <p className="text-xl font-bold text-white tabular-nums">{formatCompactNumber(topCreator.subscribers)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Abone</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.04] border border-white/5">
                      <p className="text-xl font-bold gradient-text tabular-nums">{formatCompactCurrency(topCreator.totalEarningsCents)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Kazanç</p>
                    </div>
                  </div>

                  <Link
                    href={topCreator.profilePath}
                    className="relative block h-44 rounded-2xl overflow-hidden group ring-1 ring-white/10"
                  >
                    <Image
                      src={topCreator.coverImage}
                      alt={topCreator.name}
                      fill
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-white font-medium text-sm">Profili incele</p>
                      <p className="text-xs text-muted-foreground">{topCreator.productCount} aktif ürün</p>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full gradient-bg flex items-center justify-center shadow-xl shadow-black/40 transition-transform group-hover:scale-110">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </Link>
                </>
              ) : (
                <div className="rounded-xl bg-white/[0.03] border border-white/5 p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl gradient-bg/20 bg-orange-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    İlk yaratıcılar burada öne çıkacak.
                    <br />
                    <Link href="/become-creator" className="text-orange-400 hover:underline">
                      Sen de katıl
                    </Link>
                  </p>
                </div>
              )}
            </div>

            {/* Floating stat cards — pushed outside main card to avoid overlap */}
            <div className="absolute -left-6 top-8 glass-card rounded-2xl px-4 py-3 animate-float animation-delay-300 hidden xl:flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-white tabular-nums leading-none">{formatCompactNumber(overview.totalCourses)}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Aktif Ürün</p>
              </div>
            </div>

            <div className="absolute -right-6 bottom-10 glass-card rounded-2xl px-4 py-3 animate-float animation-delay-100 hidden xl:flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-white tabular-nums leading-none">{formatCompactNumber(overview.totalStudents)}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Toplam Kayıt</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-20 lg:mt-24 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up animation-delay-500">
          {[
            { label: "Yaratıcı", value: creatorBadge },
            { label: "Kurs", value: formatCompactNumber(overview.totalCourses) },
            { label: "Öğrenci", value: formatCompactNumber(overview.totalStudents) },
            { label: "Kazanılan", value: formatCompactCurrency(overview.totalSalesCents) },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-2xl px-4 py-5 sm:p-6 text-center card-hover"
            >
              <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold gradient-text mb-1 tabular-nums">
                {stat.value}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
