"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Bilgini Paylasmaya{" "}
            <span className="gradient-text">Hazir misin?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Binlerce yaratici gibi sen de tutkunu kariyerine donustur.
            Ucretsiz basla, yalnizca kazancinin %20&apos;si kadar komisyon ode.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/become-creator">
              <Button size="lg" className="gradient-bg hover:opacity-90 text-white border-0 shadow-lg shadow-orange-500/25 px-10 h-14 text-lg w-full sm:w-auto animate-pulse-glow">
                Ucretsiz Basla
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5 px-10 h-14 text-lg w-full sm:w-auto">
                Nasil Calisir?
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">%0</div>
              <div className="text-sm text-muted-foreground">Baslangic Maliyeti</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">%80</div>
              <div className="text-sm text-muted-foreground">Kazanc Payi</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text mb-1">7/24</div>
              <div className="text-sm text-muted-foreground">Destek</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
