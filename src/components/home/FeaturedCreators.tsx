import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { listCatalogCreators } from "@/lib/server/catalog";

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(value);
}

export async function FeaturedCreators() {
  const creators = await listCatalogCreators({ limit: 6 });

  return (
    <section className="py-20 lg:py-24 relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient opacity-40" aria-hidden="true" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 border-orange-500/40 bg-orange-500/5 text-orange-400 font-medium">
              Öne Çıkan Yaratıcılar
            </Badge>
            <h2 className="text-balance text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white mb-4 tracking-tight">
              En <span className="gradient-text">popüler</span> yaratıcılar
            </h2>
            <p className="text-pretty text-muted-foreground leading-relaxed">
              Binlerce kişiye ulaşan üreticileri tek yerden inceleyin ve doğrudan yaratıcılarla bağlantı kurun.
            </p>
          </div>
          <Link href="/creators" className="shrink-0">
            <Button variant="outline" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 group">
              Tümünü Gör
              <svg className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </Link>
        </div>

        {creators.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
            {creators.map((creator) => (
              <Link key={creator.id} href={creator.profilePath} className="group block">
                <article className="glass-card rounded-2xl overflow-hidden card-hover h-full">
                  <div className="relative h-32 overflow-hidden">
                    <Image
                      src={creator.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                    <Badge className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 text-white font-medium">
                      {creator.category}
                    </Badge>
                  </div>

                  <div className="relative px-5 pb-5 pt-0">
                    <div className="relative -mt-9 mb-4 inline-block">
                      <Avatar className="w-16 h-16 border-4 border-background ring-2 ring-orange-500/40 group-hover:ring-orange-500 transition-all">
                        <AvatarImage src={creator.avatar} alt={creator.name} />
                        <AvatarFallback className="bg-white/10 text-base">{creator.name[0]}</AvatarFallback>
                      </Avatar>
                      {creator.isVerified && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full gradient-bg flex items-center justify-center ring-2 ring-background" aria-label="Doğrulanmış yaratıcı">
                          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors mb-0.5 truncate">
                      {creator.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">@{creator.username}</p>

                    <p className="text-sm text-muted-foreground/90 line-clamp-2 mb-5 min-h-[2.5rem]">
                      {creator.bio}
                    </p>

                    <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5" title="Aboneler">
                          <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-white font-medium tabular-nums">{formatCompactNumber(creator.subscribers)}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Puan">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-white font-medium tabular-nums">{creator.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-orange-400 font-semibold tabular-nums">
                          ${(creator.subscriptionPriceCents / 100).toFixed(0)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ay</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Henüz yaratıcı yok</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
              Yeni yaratıcılar katıldıkça bu alan otomatik olarak güncellenecek.
            </p>
            <Link href="/become-creator">
              <Button className="gradient-bg text-white border-0 shadow-lg shadow-orange-500/25">İlk yaratıcı sen ol</Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
