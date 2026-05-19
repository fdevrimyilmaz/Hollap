import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatorTipDialog } from "@/components/creator/CreatorTipDialog";
import { SubscribeButton } from "@/components/creator/SubscribeButton";
import { getCatalogCreatorByHandle, listCatalogProducts } from "@/lib/server/catalog";

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const creator = await getCatalogCreatorByHandle(username);

  if (!creator) {
    notFound();
  }

  const creatorCourses = await listCatalogProducts({
    creatorId: creator.id,
    includeOutOfStock: true,
  });

  const basePrice = creator.subscriptionPriceCents / 100;
  const membershipPlans: Array<{
    name: string;
    price: string;
    description: string;
    perks: string[];
    cta: string;
    highlighted: boolean;
    tier: "free" | "supporter" | "vip";
  }> = [
    {
      name: "Ücretsiz",
      price: "$0",
      description: "Açık paylaşımlar ve haftalık duyurular",
      perks: ["Herkese açık akış", "Yaratıcı duyuruları", "Topluluk yorumları"],
      cta: "Takip Et",
      highlighted: false,
      tier: "free",
    },
    {
      name: "Destekçi",
      price: `$${basePrice.toFixed(0)}/ay`,
      description: "Abonelere özel içerik ve canlı yayın erişimi",
      perks: ["Aboneye özel paylaşım", "Canlı yayın tekrarı", "Aylık AMA"],
      cta: "Abone Ol",
      highlighted: true,
      tier: "supporter",
    },
    {
      name: "VIP",
      price: `$${(basePrice * 2.5).toFixed(0)}/ay`,
      description: "Daha yakın erişim, DM önceliği ve PPV indirimi",
      perks: ["DM önceliği", "PPV %20 indirim", "Aylık mini mentorluk"],
      cta: "VIP Ol",
      highlighted: false,
      tier: "vip",
    },
  ];

  const ppvContent = creatorCourses.slice(0, 3).map((course) => ({
    id: course.id,
    title: course.name,
    price: `$${(course.amountCents / 100).toFixed(0)}`,
    type: course.category,
    unlocks: course.sold,
    status: course.stock > 0 ? "Yayında" : "Tükendi",
    thumbnail: course.thumbnail,
  }));

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen relative">
        <section className="relative h-56 md:h-80 overflow-hidden">
          <Image
            src={creator.coverImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        </section>

        <section className="relative -mt-20 md:-mt-24 pb-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              <Avatar className="w-28 h-28 md:w-36 md:h-36 border-4 border-background ring-4 ring-orange-500/40 shadow-2xl shadow-black/60">
                <AvatarImage src={creator.avatar} alt={creator.name} />
                <AvatarFallback className="text-3xl bg-white/10">{creator.name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white tracking-tight truncate">
                    {creator.name}
                  </h1>
                  {creator.isVerified && (
                    <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center shrink-0" aria-label="Doğrulanmış yaratıcı">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground mb-3 text-sm">@{creator.username}</p>
                <Badge className="gradient-bg border-0 text-white font-semibold">{creator.category}</Badge>
              </div>

              <div className="flex gap-2.5 w-full md:w-auto">
                <SubscribeButton
                  creatorId={creator.id}
                  creatorName={creator.name}
                  priceLabel={`$${(creator.subscriptionPriceCents / 100).toFixed(0)}/ay`}
                  tier="supporter"
                />
                <CreatorTipDialog creatorId={creator.id} creatorName={creator.name} />
                <Button size="lg" variant="outline" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 h-12 w-12 p-0" aria-label="Paylaş">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-8">
              {[
                { label: "Takipçi", value: formatCompactNumber(creator.followers) },
                { label: "Abone", value: formatCompactNumber(creator.subscribers) },
                { label: "Ürün", value: creator.productCount.toString() },
                { label: "İçerik", value: creator.posts.toString() },
                { label: "Puan", value: creator.rating.toFixed(1) },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl px-4 py-4 text-center">
                  <p className="text-2xl font-display font-bold gradient-text tabular-nums">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 glass-card rounded-2xl p-6">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Hakkında</h2>
              <p className="text-muted-foreground leading-relaxed">{creator.bio}</p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <Tabs defaultValue="courses" className="w-full">
              <TabsList className="w-full md:w-auto glass border-white/10 p-1 mb-8">
                <TabsTrigger value="courses" className="data-[state=active]:gradient-bg data-[state=active]:text-white font-medium">
                  Kurslar ({creatorCourses.length})
                </TabsTrigger>
                <TabsTrigger value="posts" className="data-[state=active]:gradient-bg data-[state=active]:text-white font-medium">
                  İçerikler ({ppvContent.length})
                </TabsTrigger>
                <TabsTrigger value="membership" className="data-[state=active]:gradient-bg data-[state=active]:text-white font-medium">
                  Üyelik Katmanları
                </TabsTrigger>
              </TabsList>

              <TabsContent value="courses">
                {creatorCourses.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {creatorCourses.map((course) => (
                      <Link key={course.id} href={`/course/${course.id}`} className="group block">
                        <article className="glass-card rounded-2xl overflow-hidden card-hover h-full">
                          <div className="relative aspect-video overflow-hidden">
                            <Image
                              src={course.thumbnail}
                              alt=""
                              fill
                              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                              className="object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <Badge className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 text-white">{course.duration}</Badge>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors mb-2 line-clamp-2 leading-snug">{course.name}</h3>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="text-sm text-white tabular-nums font-medium">{course.rating.toFixed(1)}</span>
                              </div>
                              <span className="text-base font-display font-bold text-white tabular-nums">${(course.amountCents / 100).toFixed(0)}</span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
                    Bu yaratıcının henüz aktif ürünü yok.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="posts">
                {ppvContent.length > 0 ? (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {ppvContent.map((item) => (
                      <article key={item.id} className="glass-card rounded-2xl overflow-hidden card-hover">
                        <div className="relative aspect-video">
                          <Image
                            src={item.thumbnail}
                            alt=""
                            fill
                            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <Badge className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 text-white">{item.type}</Badge>
                          <Badge className="absolute top-3 right-3 gradient-bg border-0 text-white font-semibold">{item.price}</Badge>
                          <div className="absolute bottom-3 left-3">
                            <Badge className={item.status === "Yayında" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}>
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-white mb-1 line-clamp-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3 tabular-nums">{item.unlocks} satış</p>
                          <Button size="sm" className="w-full gradient-bg hover:opacity-95 border-0 text-white font-medium">
                            PPV ile Satın Al
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
                    Gösterilecek içerik bulunamadı.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="membership">
                <div className="grid md:grid-cols-3 gap-5">
                  {membershipPlans.map((plan) => (
                    <div
                      key={plan.name}
                      className={`relative glass-card rounded-2xl p-6 ${
                        plan.highlighted ? "ring-2 ring-orange-500/60 shadow-xl shadow-orange-500/10" : ""
                      }`}
                    >
                      {plan.highlighted && (
                        <Badge className="absolute -top-2.5 left-6 gradient-bg border-0 text-white font-semibold shadow-md shadow-orange-500/30">
                          En çok tercih edilen
                        </Badge>
                      )}
                      <h3 className="text-lg font-display font-semibold text-white mb-1 tracking-tight">{plan.name}</h3>
                      <p className="text-3xl font-display font-bold text-white mb-2 tabular-nums">{plan.price}</p>
                      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{plan.description}</p>
                      <div className="space-y-2.5 mb-6">
                        {plan.perks.map((perk) => (
                          <div key={perk} className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-muted-foreground">{perk}</span>
                          </div>
                        ))}
                      </div>
                      <div className="w-full">
                        <SubscribeButton
                          creatorId={creator.id}
                          creatorName={creator.name}
                          priceLabel={plan.price}
                          tier={plan.tier}
                          compact
                          variant={plan.highlighted ? "default" : "outline"}
                          label={plan.cta}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
