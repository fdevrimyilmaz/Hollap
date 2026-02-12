import Link from "next/link";
import { Header } from "@/components/layout/Header";
import Image from "next/image";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { courses } from "@/lib/data";

export default function NewContentPage() {
  const latestCourses = [...courses].sort((a, b) => Number(b.id) - Number(a.id));

  return (
    <main className="min-h-screen relative">
      <Header />

      <section className="pt-28 pb-12">
        <div className="container mx-auto px-4">
          <Badge variant="outline" className="mb-4 border-orange-500/50 text-orange-500">
            Yeni Icerikler
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Yeni Eklenenler</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Son eklenen kurslari tarih sirasina gore inceleyebilirsin.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4 space-y-4">
          {latestCourses.map((course, index) => (
            <Link key={course.id} href={`/course/${course.id}`} className="block group">
              <article className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="w-full sm:w-40 h-24 rounded-xl overflow-hidden shrink-0">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    width={160}
                    height={96}
                    sizes="(min-width: 640px) 160px, 100vw"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Yayin #{index + 1}</p>
                  <h2 className="text-lg font-semibold text-white group-hover:text-orange-500 transition-colors">
                    {course.title}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-muted-foreground">{course.creator.name}</p>
                  <p className="text-lg font-bold gradient-text">${course.price}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
