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
  const membershipPlans = [
    {
      name: "Free",
      price: "$0",
      description: "Acik postlar ve haftalik duyurular",
      perks: ["Public feed", "Creator duyurulari", "Topluluk yorumlari"],
      cta: "Takip Et",
      highlighted: false,
    },
    {
      name: "Supporter",
      price: `$${basePrice.toFixed(2)}/ay`,
      description: "Abonelere ozel icerik ve canli yayin erisimi",
      perks: ["Subscriber-only post", "Canli yayin replay", "Aylik AMA"],
      cta: "Abone Ol",
      highlighted: true,
    },
    {
      name: "VIP",
      price: `$${(basePrice * 2.5).toFixed(2)}/ay`,
      description: "Daha yakin erisim, DM onceligi ve PPV indirimi",
      perks: ["DM onceligi", "PPV %20 indirim", "Aylik mini mentorluk"],
      cta: "VIP Ol",
      highlighted: false,
    },
  ];

  const ppvContent = creatorCourses.slice(0, 3).map((course) => ({
    id: course.id,
    title: course.name,
    price: `$${(course.amountCents / 100).toFixed(2)}`,
    type: course.category,
    unlocks: course.sold,
    status: course.stock > 0 ? "Yayinda" : "Tukendi",
    thumbnail: course.thumbnail,
  }));

  return (
    <main className="min-h-screen relative">
      <Header />

      <section className="relative h-64 md:h-80 overflow-hidden">
        <Image
          src={creator.coverImage}
          alt={creator.name}
          fill
          sizes="100vw"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </section>

      <section className="relative -mt-20 pb-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-background ring-4 ring-orange-500/50 shadow-2xl">
              <AvatarImage src={creator.avatar} alt={creator.name} />
              <AvatarFallback className="text-4xl">{creator.name[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white">{creator.name}</h1>
                {creator.isVerified && (
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground mb-2">@{creator.username}</p>
              <Badge className="gradient-bg border-0">{creator.category}</Badge>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Button size="lg" className="gradient-bg hover:opacity-90 text-white border-0 shadow-lg shadow-orange-500/25 flex-1 md:flex-none">
                Abone Ol - ${(creator.subscriptionPriceCents / 100).toFixed(2)}/ay
              </Button>
              <CreatorTipDialog creatorId={creator.id} creatorName={creator.name} />
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            {[
              { label: "Takipci", value: formatCompactNumber(creator.followers) },
              { label: "Abone", value: formatCompactNumber(creator.subscribers) },
              { label: "Urun", value: creator.productCount.toString() },
              { label: "Icerik", value: creator.posts.toString() },
              { label: "Puan", value: creator.rating.toString() },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 text-center">
                <p className="text-2xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 glass rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-3">Hakkinda</h3>
            <p className="text-muted-foreground">{creator.bio}</p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="courses" className="w-full">
            <TabsList className="w-full md:w-auto glass border-white/10 p-1 mb-8">
              <TabsTrigger value="courses" className="data-[state=active]:gradient-bg data-[state=active]:text-white">
                Kurslar ({creatorCourses.length})
              </TabsTrigger>
              <TabsTrigger value="posts" className="data-[state=active]:gradient-bg data-[state=active]:text-white">
                Icerikler ({ppvContent.length})
              </TabsTrigger>
              <TabsTrigger value="membership" className="data-[state=active]:gradient-bg data-[state=active]:text-white">
                Uyelik Katmanlari
              </TabsTrigger>
            </TabsList>

            <TabsContent value="courses">
              {creatorCourses.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {creatorCourses.map((course) => (
                    <Link key={course.id} href={`/course/${course.id}`} className="group">
                      <div className="glass-card rounded-2xl overflow-hidden card-hover">
                        <div className="relative aspect-video overflow-hidden">
                          <Image
                            src={course.thumbnail}
                            alt={course.name}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <Badge className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm border-0">{course.duration}</Badge>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-white group-hover:text-orange-500 transition-colors mb-2 line-clamp-2">{course.name}</h3>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              <span className="text-sm text-white">{course.rating}</span>
                            </div>
                            <span className="font-bold gradient-text">${(course.amountCents / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-white/5 p-5 text-sm text-muted-foreground">
                  Bu yaraticinin henuz aktif urunu yok.
                </div>
              )}
            </TabsContent>

            <TabsContent value="posts">
              {ppvContent.length > 0 ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {ppvContent.map((item) => (
                    <div key={item.id} className="glass-card rounded-2xl overflow-hidden card-hover">
                      <div className="relative aspect-video">
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          fill
                          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <Badge className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm border-0">{item.type}</Badge>
                        <Badge className="absolute top-3 right-3 gradient-bg border-0">{item.price}</Badge>
                        <div className="absolute bottom-3 left-3">
                          <Badge className={item.status === "Yayinda" ? "bg-green-500/20 text-green-500 border-0" : "bg-yellow-500/20 text-yellow-500 border-0"}>
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{item.unlocks} satis</p>
                        <Button size="sm" className="w-full gradient-bg hover:opacity-90 border-0 text-white">
                          PPV ile Satin Al
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-white/5 p-5 text-sm text-muted-foreground">
                  Gosterilecek icerik bulunmadi.
                </div>
              )}
            </TabsContent>

            <TabsContent value="membership">
              <div className="grid md:grid-cols-3 gap-6">
                {membershipPlans.map((plan) => (
                  <div key={plan.name} className={`glass-card rounded-2xl p-6 ${plan.highlighted ? "ring-2 ring-orange-500" : ""}`}>
                    {plan.highlighted && <Badge className="mb-4 gradient-bg border-0">En Cok Tercih Edilen</Badge>}
                    <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                    <p className="text-2xl font-bold gradient-text mb-2">{plan.price}</p>
                    <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                    <div className="space-y-2 mb-6">
                      {plan.perks.map((perk) => (
                        <div key={perk} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                          <span className="text-sm text-muted-foreground">{perk}</span>
                        </div>
                      ))}
                    </div>
                    <Button className={`w-full ${plan.highlighted ? "gradient-bg text-white border-0" : "border-white/20"}`} variant={plan.highlighted ? "default" : "outline"}>
                      {plan.cta}
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Footer />
    </main>
  );
}
