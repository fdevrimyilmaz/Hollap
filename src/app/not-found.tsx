import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Sayfa bulunamadi - Hollap",
};

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Aradiginiz sayfa bulunamadi
      </h1>
      <p className="mt-3 max-w-md text-base text-muted-foreground">
        Bu baglanti tasinmis, kaldirilmis veya hic var olmamis olabilir.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Anasayfaya don</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/explore">Icerikleri kesfet</Link>
        </Button>
      </div>
    </main>
  );
}
