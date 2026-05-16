import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { listCatalogCategories } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCatalogCategories();

  return (
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-28 pb-12">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-4 border-orange-500/50 text-orange-500">
            Kategoriler
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Tum Kategoriler</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Kategoriler, aktif urun listesine gore otomatik guncellenir.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4">
          {categories.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link key={category.id} href={`/category/${category.id}`} className="group">
                  <article className="glass-card rounded-2xl p-6 card-hover h-full">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} mb-4`} />
                    <h2 className="text-lg font-semibold text-white group-hover:text-orange-500 transition-colors">
                      {category.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">{category.count} icerik</p>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <article className="glass-card rounded-2xl p-8 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-white mb-3">Kategori bulunamadi</h2>
              <p className="text-muted-foreground">
                Veritabaninda aktif urun olmadigi icin kategori listesi henuz olusmadi.
              </p>
            </article>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
