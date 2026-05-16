import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCatalogProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

export default async function CoursesPage() {
  const courses = await listCatalogProducts();

  return (
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-28 pb-12">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-4 border-orange-500/50 text-orange-500">
            Tum Kurslar
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Ogrenmek Istedigin Konuyu Sec
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Programlama, tasarim, fitness ve daha fazlasinda yayindaki kurslari tek yerden inceleyebilirsin.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link key={course.id} href={`/course/${course.id}`} className="group">
                <article className="glass-card rounded-2xl overflow-hidden card-hover h-full">
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={course.thumbnail}
                      alt={course.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <Badge className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm border-0">
                      {course.duration}
                    </Badge>
                  </div>

                  <div className="p-5 space-y-3">
                    <Badge variant="outline" className="border-white/10 text-xs">
                      {course.category}
                    </Badge>
                    <h2 className="text-lg font-semibold text-white group-hover:text-orange-500 transition-colors line-clamp-2">
                      {course.name}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-sm text-muted-foreground">{formatNumber(course.students)} ogrenci</span>
                      <span className="text-lg font-bold gradient-text">${(course.amountCents / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/explore">
              <Button variant="outline" className="border-white/20 hover:bg-white/5">
                Gelismis Filtrelerle Kesfet
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
