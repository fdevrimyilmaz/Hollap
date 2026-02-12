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
          throw new Error("Urun listesi alinamadi");
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
          "Urunler yuklenemedi",
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
      showToast.warning("Urun secimi gerekli", "Lutfen once bir urun secin");
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
        showToast.warning("Giris gerekli", "Odeme icin once hesabiniza giris yapin");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Checkout baslatilamadi");
      }

      const payload = (await response.json()) as { checkoutUrl?: string };
      if (!payload.checkoutUrl) {
        throw new Error("Stripe checkout URL donmedi");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      showToast.error(
        "Odeme baslatilamadi",
        error instanceof Error ? error.message : "Bilinmeyen hata"
      );
    } finally {
      setIsProcessing(false);
      idempotencyKeyRef.current = `chk_${crypto.randomUUID()}`;
    }
  };

  if (paymentSuccess) {
    return (
      <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-[150px]" />

        <div className="relative z-10 text-center max-w-md px-4">
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 animate-bounce">
            <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Odeme Basarili!</h1>
          <p className="text-muted-foreground mb-8">
            Satin aliminiz basariyla tamamlandi. Iceriklerinize dashboard uzerinden erisebilirsiniz.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/courses">
              <Button className="gradient-bg hover:opacity-90 text-white border-0">
                Kurslara Git
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/20">
                Dashboard&apos;a Git
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden py-12">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-500/15 rounded-full blur-[150px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">
              Holl<span className="gradient-text">ap</span>
            </span>
          </Link>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="glass-card rounded-2xl p-6 h-fit">
              <h2 className="text-xl font-semibold text-white mb-6">Siparis Ozeti</h2>

              <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Secilen urun</span>
                  <span className="text-white">{selectedProduct?.name ?? "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Satici</span>
                  <span className="text-white">{selectedProduct?.creatorName ?? "-"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Kalan stok</span>
                  <span className="text-white">{selectedProduct?.stock ?? 0}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="font-semibold text-white">Toplam</span>
                <span className="text-2xl font-bold gradient-text">{totalLabel}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Stripe Checkout ile guvenli odeme
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Fiyat server tarafinda dogrulanir
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 flex flex-col justify-between gap-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">Guvenli Odeme</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Stripe&apos;in guvenli odeme sayfasina yonlendirilirsiniz. Kart bilgileri bu uygulamada toplanmaz.
                </p>

                <label htmlFor="checkout-product" className="block text-sm font-medium text-white mb-2">
                  Satin alinacak urun
                </label>
                <select
                  id="checkout-product"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  disabled={isLoadingProducts || isProcessing || products.length === 0}
                  className="h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white disabled:opacity-60"
                >
                  {products.length === 0 ? (
                    <option value="">Urun bulunamadi</option>
                  ) : (
                    products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - ${(product.amountCents / 100).toFixed(2)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <Button
                type="button"
                disabled={isProcessing || isLoadingProducts || !selectedProduct}
                onClick={() => void handlePayment()}
                className="w-full h-14 gradient-bg hover:opacity-90 text-white border-0 shadow-lg shadow-orange-500/25 text-lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Isleniyor...
                  </div>
                ) : (
                  `${totalLabel} ile Stripe'a devam et`
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Odeme yaparak <Link href="/terms" className="text-orange-500">Kullanim Sartlari</Link>&apos;ni kabul etmis olursun.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
