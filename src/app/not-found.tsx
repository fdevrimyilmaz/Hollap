import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sayfa bulunamadı",
};

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-24 text-center overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-500/15 rounded-full blur-[150px]" aria-hidden="true" />

      <div className="relative z-10 max-w-lg">
        <p className="text-8xl sm:text-9xl font-display font-bold gradient-text tabular-nums leading-none mb-2">
          404
        </p>
        <h1 className="mt-6 text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
          Aradığın sayfa bulunamadı
        </h1>
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          Bu bağlantı taşınmış, kaldırılmış veya hiç var olmamış olabilir.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="gradient-bg text-white border-0 shadow-lg shadow-orange-500/25 h-11 px-6 font-medium">
            <Link href="/">Anasayfaya dön</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 h-11 px-6 font-medium">
            <Link href="/explore">İçerikleri keşfet</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
