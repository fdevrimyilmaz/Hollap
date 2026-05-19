"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ToastProvider";

type CheckoutProduct = {
  id: string;
  name: string;
  amountCents: number;
  stock: number;
  creatorName: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [products, setProducts] = useState<CheckoutProduct[]>([]);
  const idempotencyKeyRef = useRef(`chk_${crypto.randomUUID()}`);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preselectedProductId = params.get("productId") ?? "";

    setPaymentSuccess(params.get("status") === "success");

    void (async () => {
      try {
        const response = await fetch("/api/payments/products", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Ürün listesi alınamadı");
        }

        const payload = (await response.json()) as { products?: CheckoutProduct[] };
        const availableProducts = payload.products ?? [];

        setProducts(availableProducts);

        const initialProduct =
          availableProducts.find((product) => product.id === preselectedProductId) ??
          availableProducts[0];

        setSelectedProductId(initialProduct?.id ?? "");
      } catch (error) {
        showToast.error(
          "Ürünler yüklenemedi",
          error instanceof Error ? error.message : "Bilinmeyen hata"
        );
      } finally {
        setIsLoadingProducts(false);
      }
    })();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const totalLabel = useMemo(() => {
    if (!selectedProduct) {
      return "$0.00";
    }

    return `$${(selectedProduct.amountCents / 100).toFixed(2)}`;
  }, [selectedProduct]);

  const handlePayment = async () => {
    if (!selectedProduct) {
      showToast.warning("Ürün seçimi gerekli", "Lütfen önce bir ürün seçin");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          successPath: "/checkout?status=success",
          cancelPath: "/checkout?status=cancelled",
        }),
      });

      if (response.status === 401 || response.status === 403) {
        showToast.warning("Giriş gerekli", "Ödeme için önce hesabınıza giriş yapın");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Ödeme başlatılamadı");
      }

      const payload = (await response.json()) as { checkoutUrl?: string };
      if (!payload.checkoutUrl) {
        throw new Error("Ödeme bağlantısı alınamadı");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      showToast.error(
        "Ödeme başlatılamadı",
        error instanceof Error ? error.message : "Bilinmeyen hata"
      );
    } finally {
      setIsProcessing(false);
      idempotencyKeyRef.current = `chk_${crypto.randomUUID()}`;
    }
  };

  if (paymentSuccess) {
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
        <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[150px]" aria-hidden="true" />

        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4 tracking-tight">Ödeme başarılı!</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Satın alımın başarıyla tamamlandı. İçeriklerine yönetim paneli üzerinden erişebilirsin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard">
              <Button className="gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/25 w-full sm:w-auto h-11 px-6 font-medium">
                Panele Git
              </Button>
            </Link>
            <Link href="/courses">
              <Button variant="outline" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 w-full sm:w-auto h-11 px-6 font-medium">
                Kurslara Göz At
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden py-12 lg:py-16">
      <div className="absolute inset-0 mesh-gradient" aria-hidden="true" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-500/15 rounded-full blur-[150px]" aria-hidden="true" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-orange-500/30">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-display font-bold text-white tracking-tight">
              Holl<span className="gradient-text">ap</span>
            </span>
          </Link>

          <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-8 tracking-tight">
            Ödeme
          </h1>

          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
            <div className="glass-card rounded-2xl p-6 lg:p-7 h-fit order-2 lg:order-1">
              <h2 className="text-base font-semibold text-white mb-5 uppercase tracking-wider text-xs">Sipariş Özeti</h2>

              <div className="space-y-3 mb-5 pb-5 border-b border-white/10">
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-muted-foreground shrink-0">Seçilen ürün</span>
                  <span className="text-white text-right truncate">{selectedProduct?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm gap-3">
                  <span className="text-muted-foreground shrink-0">Satıcı</span>
                  <span className="text-white text-right truncate">{selectedProduct?.creatorName ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kalan stok</span>
                  <span className="text-white tabular-nums">{selectedProduct?.stock ?? 0}</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline mb-6">
                <span className="font-semibold text-white">Toplam</span>
                <span className="text-3xl font-display font-bold text-white tabular-nums">{totalLabel}</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Stripe Checkout ile güvenli ödeme
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Fiyat sunucu tarafında doğrulanır
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Kart bilgileri Hollap&apos;ta saklanmaz
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 lg:p-7 flex flex-col justify-between gap-6 order-1 lg:order-2">
              <div>
                <h2 className="text-xl font-display font-semibold text-white mb-2 tracking-tight">Güvenli ödeme</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Stripe&apos;ın güvenli ödeme sayfasına yönlendirilirsin. Kart bilgileri bu uygulamada toplanmaz.
                </p>

                <label htmlFor="checkout-product" className="block text-sm font-medium text-white mb-2">
                  Satın alınacak ürün
                </label>
                <select
                  id="checkout-product"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  disabled={isLoadingProducts || isProcessing || products.length === 0}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 hover:border-white/20 focus:border-orange-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 px-3.5 text-sm text-white disabled:opacity-60 transition-colors"
                >
                  {products.length === 0 ? (
                    <option value="">Ürün bulunamadı</option>
                  ) : (
                    products.map((product) => (
                      <option key={product.id} value={product.id} className="bg-card">
                        {product.name} — ${(product.amountCents / 100).toFixed(2)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <Button
                type="button"
                disabled={isProcessing || isLoadingProducts || !selectedProduct}
                onClick={() => void handlePayment()}
                className="w-full h-14 gradient-bg hover:opacity-95 text-white border-0 shadow-lg shadow-orange-500/30 text-base font-medium disabled:opacity-50"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2.5">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                    </svg>
                    İşleniyor…
                  </div>
                ) : (
                  <>
                    {totalLabel} ile ödeme yap
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                Ödeme yaparak{" "}
                <Link href="/terms" className="text-orange-400 hover:text-orange-300 transition-colors">
                  Kullanım Şartları
                </Link>
                &apos;nı kabul etmiş olursun.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
