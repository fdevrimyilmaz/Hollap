import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCatalogCategories, listCatalogProducts } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const categories = await listCatalogCategories();
  const category = categories.find((item) => item.id === id);

  if (!category) {
    notFound();
  }

  const categoryCourses = await listCatalogProducts({ category: category.name });

  return (
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-28 pb-12">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-4 border-orange-500/50 text-orange-500">
            Kategori
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">{category.name}</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Bu kategoride {categoryCourses.length} aktif urun bulundu.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4">
          {categoryCourses.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryCourses.map((course) => (
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
                    </div>
                    <div className="p-5">
                      <h2 className="text-lg font-semibold text-white group-hover:text-orange-500 transition-colors line-clamp-2 mb-2">
                        {course.name}
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{course.creatorName}</span>
                        <span className="font-bold gradient-text">${(course.amountCents / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <article className="glass-card rounded-2xl p-8 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-white mb-3">Bu kategoride henuz aktif urun yok</h2>
              <p className="text-muted-foreground mb-6">
                Diger kategorilerdeki urunleri kesfetmek icin genel listeye don.
              </p>
              <Link href="/courses">
                <Button className="gradient-bg hover:opacity-90 text-white border-0">Tum Kurslari Gor</Button>
              </Link>
            </article>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
