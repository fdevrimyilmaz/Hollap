"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { showToast } from "@/components/ToastProvider";
import { NotificationsDropdown } from "@/components/Notifications";
import { useNotificationCenter } from "@/components/NotificationCenter";

type StatItem = { label: string; value: string; change: string };
type SaleItem = { name: string; product: string; amount: string; time: string };
type LiveSession = {
  id: string;
  title: string;
  schedule: string;
  booked: number;
  total: number;
  isLive: boolean;
  playbackUrl: string | null;
};
type Product = { id: string; name: string; price: number; stock: number; sold: number; isActive: boolean };
type ProductDraft = { name: string; price: string; stock: string };
type DmOrder = {
  id: string;
  buyer: string;
  productId: string;
  productName: string;
  amount: string;
  status: "pending" | "payment_link_sent" | "paid" | "completed" | "failed" | "refunded";
  paymentLinkUrl: string | null;
};
type SentFileLog = { filesCount: number; audience: string; time: string };
type SessionInfo = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
};

type PreparedUploadPlan = {
  assetId: string;
  uploadUrl: string;
  uploadMethod: "PUT";
  uploadHeaders: Record<string, string>;
};

type DashboardPayload = {
  stats: StatItem[];
  recentSales: SaleItem[];
  liveSessions: LiveSession[];
  products: Product[];
  dmOrders: DmOrder[];
  sentFilesLog: SentFileLog[];
};

const dmStatusLabels: Record<DmOrder["status"], string> = {
  pending: "bekliyor",
  payment_link_sent: "odeme linki gonderildi",
  paid: "odendi",
  completed: "tamamlandi",
  failed: "basarisiz",
  refunded: "iade",
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Istek basarisiz (${response.status})`;
  } catch {
    return `Istek basarisiz (${response.status})`;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { refreshNotifications } = useNotificationCenter();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [recentSales, setRecentSales] = useState<SaleItem[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dmOrders, setDmOrders] = useState<DmOrder[]>([]);
  const [sentFilesLog, setSentFilesLog] = useState<SentFileLog[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsBusyId, setSessionsBusyId] = useState<string | null>(null);

  const [fileAudience, setFileAudience] = useState("tum-aboneler");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSendingFiles, setIsSendingFiles] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("19.99");
  const [newProductStock, setNewProductStock] = useState("50");
  const [productDrafts, setProductDrafts] = useState<Record<string, ProductDraft>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product])) as Record<string, Product>,
    [products]
  );

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = (await response.json()) as DashboardPayload;
      setStats(payload.stats);
      setRecentSales(payload.recentSales);
      setLiveSessions(payload.liveSessions);
      setProducts(payload.products);
      setDmOrders(payload.dmOrders);
      setSentFilesLog(payload.sentFilesLog);
    } catch (error) {
      showToast.error("Dashboard yuklenemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const response = await fetch("/api/auth/sessions", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = (await response.json()) as { sessions?: SessionInfo[] };
      setSessions(payload.sessions ?? []);
    } catch (error) {
      showToast.error("Oturumlar yuklenemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    setProductDrafts(
      Object.fromEntries(
        products.map((product) => [
          product.id,
          {
            name: product.name,
            price: product.price.toFixed(2),
            stock: String(product.stock),
          },
        ])
      ) as Record<string, ProductDraft>
    );
  }, [products]);

  const onFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
  };

  const updateProductDraft = (productId: string, field: keyof ProductDraft, value: string) => {
    setProductDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? { name: "", price: "", stock: "" }),
        [field]: value,
      },
    }));
  };

  const sendFilesToSubscribers = async () => {
    if (!selectedFiles.length) {
      showToast.warning("Dosya secilmedi", "En az bir dosya secin");
      return;
    }

    if (isSendingFiles) {
      return;
    }

    setIsSendingFiles(true);

    try {
      const prepareResponse = await fetch("/api/dashboard/files/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: fileAudience,
          files: selectedFiles.map((file) => ({
            name: file.name,
            size: file.size,
            type: file.type,
          })),
        }),
      });

      if (!prepareResponse.ok) {
        showToast.error("Dosya gonderimi basarisiz", await readErrorMessage(prepareResponse));
        return;
      }

      const preparePayload = (await prepareResponse.json()) as { uploads?: PreparedUploadPlan[] };
      const uploads = preparePayload.uploads ?? [];

      if (uploads.length !== selectedFiles.length) {
        showToast.error("Dosya gonderimi basarisiz", "Upload plani olusturulamadi");
        return;
      }

      for (let index = 0; index < uploads.length; index += 1) {
        const upload = uploads[index];
        const file = selectedFiles[index];
        const uploadResponse = await fetch(upload.uploadUrl, {
          method: upload.uploadMethod,
          headers: upload.uploadHeaders,
          body: file,
        });

        if (!uploadResponse.ok) {
          const detail = await uploadResponse.text().catch(() => "");
          const reason = detail.trim() || `Upload failed (${uploadResponse.status})`;
          showToast.error("Dosya yukleme basarisiz", reason);
          return;
        }
      }

      const finalizeResponse = await fetch("/api/dashboard/files/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: fileAudience,
          assetIds: uploads.map((upload) => upload.assetId),
        }),
      });

      if (!finalizeResponse.ok) {
        showToast.error("Dosya gonderimi basarisiz", await readErrorMessage(finalizeResponse));
        return;
      }

      await Promise.all([loadDashboard(), refreshNotifications()]);
      showToast.success("Dosyalar gonderildi", "Yetkili abonelere dagitildi");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsSendingFiles(false);
    }
  };

  const toggleLive = async (sessionId: string) => {
    const response = await fetch(`/api/dashboard/live/${sessionId}/toggle`, { method: "POST" });
    if (!response.ok) {
      showToast.error("Canli yayin guncellenemedi", await readErrorMessage(response));
      return;
    }

    await Promise.all([loadDashboard(), refreshNotifications()]);
  };

  const addProduct = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/dashboard/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProductName, price: Number(newProductPrice), stock: Number(newProductStock) }),
    });

    if (!response.ok) {
      showToast.error("Urun eklenemedi", await readErrorMessage(response));
      return;
    }

    setNewProductName("");
    setNewProductPrice("19.99");
    setNewProductStock("50");
    await loadDashboard();
    showToast.success("Urun eklendi", "Gercek backend kaydi olusturuldu");
  };
  const activateProduct = async (productId: string) => {
    const response = await fetch(`/api/dashboard/products/${productId}/activate`, { method: "POST" });
    if (!response.ok) {
      showToast.error("Urun aktif edilemedi", await readErrorMessage(response));
      return;
    }

    await loadDashboard();
  };

  const saveProduct = async (productId: string) => {
    const draft = productDrafts[productId];
    if (!draft) {
      showToast.warning("Urun bulunamadi", "Lutfen tekrar deneyin");
      return;
    }

    const name = draft.name.trim();
    const price = Number(draft.price);
    const stock = Number(draft.stock);

    if (!name || Number.isNaN(price) || price <= 0 || Number.isNaN(stock) || stock < 0) {
      showToast.warning("Gecersiz urun bilgisi", "Ad, fiyat ve stok degerlerini kontrol edin");
      return;
    }

    const response = await fetch(`/api/dashboard/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        price,
        stock: Math.floor(stock),
      }),
    });

    if (!response.ok) {
      showToast.error("Urun guncellenemedi", await readErrorMessage(response));
      return;
    }

    await loadDashboard();
    showToast.success("Urun guncellendi", "Fiyatlandirma degisiklikleri kaydedildi");
  };

  const sendDmPaymentLink = async (orderId: string) => {
    const response = await fetch(`/api/dashboard/dm-orders/${orderId}/payment-link`, {
      method: "POST",
      headers: {
        "X-Idempotency-Key": `dm_${orderId}_${crypto.randomUUID()}`,
      },
    });
    if (!response.ok) {
      showToast.error("Odeme linki olusturulamadi", await readErrorMessage(response));
      return;
    }

    const payload = (await response.json()) as { paymentUrl?: string };
    await Promise.all([loadDashboard(), refreshNotifications()]);

    if (payload.paymentUrl) {
      window.open(payload.paymentUrl, "_blank", "noopener,noreferrer");
    }
  };

  const completeDmPurchase = async (orderId: string) => {
    const response = await fetch(`/api/dashboard/dm-orders/${orderId}/complete`, { method: "POST" });
    if (!response.ok) {
      showToast.error("Siparis tamamlanamadi", await readErrorMessage(response));
      return;
    }

    await Promise.all([loadDashboard(), refreshNotifications()]);
    showToast.success("DM siparisi tamamlandi", "Odeme sonrasinda teslim kaydi olusturuldu");
  };

  const revokeSingleSession = async (sessionId: string) => {
    setSessionsBusyId(sessionId);
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      await loadSessions();
      showToast.success("Oturum sonlandirildi", "Secilen cihazin oturumu kapatildi");
    } catch (error) {
      showToast.error("Oturum kapatilamadi", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setSessionsBusyId(null);
    }
  };

  const revokeOtherSessions = async () => {
    setSessionsBusyId("others");
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ others: true }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      await loadSessions();
      showToast.success("Diger oturumlar kapatildi", "Sadece bu cihazdaki oturum acik kaldi");
    } catch (error) {
      showToast.error("Oturumlar kapatilamadi", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setSessionsBusyId(null);
    }
  };

  return (
    <main className="min-h-screen p-6 bg-background space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Yukleniyor..." : "Gercek backend + kalici veri aktif"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Demo hesaplar: `creator@hollap.dev / creator123`, `student@hollap.dev / student123`
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" className="border-white/10">
              Ana Sayfa
            </Button>
          </Link>
          <NotificationsDropdown />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card border-white/10">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold text-white mt-1">{stat.value}</p>
              <Badge className="mt-2 bg-green-500/20 text-green-500 border-0">{stat.change}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Son Satislar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSales.length === 0 && <p className="text-sm text-muted-foreground">Kayit yok.</p>}
            {recentSales.map((sale) => (
              <div key={`${sale.name}-${sale.time}-${sale.product}`} className="rounded-xl bg-white/5 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{sale.name}</p>
                  <p className="text-xs text-muted-foreground">{sale.product}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm gradient-text">{sale.amount}</p>
                  <p className="text-xs text-muted-foreground">{sale.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Abonelere Dosya Gonderimi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
              value={fileAudience}
              onChange={(event) => setFileAudience(event.target.value)}
            >
              <option value="tum-aboneler">Tum aboneler</option>
              <option value="vip">VIP aboneler</option>
              <option value="yeni">Yeni aboneler</option>
            </select>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.zip"
              onChange={onFileSelect}
              className="block h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />

            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file) => (
                  <Badge key={`${file.name}-${file.size}`} variant="outline" className="border-white/10 text-xs">
                    {file.name}
                  </Badge>
                ))}
              </div>
            )}

            <Button
              className="gradient-bg text-white border-0"
              disabled={isSendingFiles}
              onClick={() => void sendFilesToSubscribers()}
            >
              {isSendingFiles ? "Yukleniyor..." : "Dosyalari Gonder"}
            </Button>

            {sentFilesLog.map((log, index) => (
              <div key={`${log.time}-${index}`} className="rounded-xl bg-white/5 p-3">
                <p className="text-sm text-white">{log.filesCount} dosya gonderildi</p>
                <p className="text-xs text-muted-foreground">{log.audience} • {log.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Canli Yayinlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveSessions.map((session) => (
              <div key={session.id} className="rounded-xl bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">{session.title}</p>
                    <p className="text-xs text-muted-foreground">{session.schedule}</p>
                  </div>
                  <Badge className={session.isLive ? "bg-red-500/20 text-red-500 border-0" : "bg-blue-500/20 text-blue-500 border-0"}>
                    {session.isLive ? "Canli" : "Hazir"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={Math.round((session.booked / session.total) * 100)} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground">{session.booked}/{session.total}</span>
                </div>
                {session.playbackUrl && <p className="text-xs text-muted-foreground break-all">{session.playbackUrl}</p>}
                <Button size="sm" className="gradient-bg text-white border-0" onClick={() => void toggleLive(session.id)}>
                  {session.isLive ? "Yayini Bitir" : "Canli Baslat"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Urunler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={(event) => void addProduct(event)} className="grid grid-cols-3 gap-2">
              <input value={newProductName} onChange={(event) => setNewProductName(event.target.value)} placeholder="Urun" className="col-span-3 h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white" />
              <input value={newProductPrice} onChange={(event) => setNewProductPrice(event.target.value)} placeholder="Fiyat" className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white" />
              <input value={newProductStock} onChange={(event) => setNewProductStock(event.target.value)} placeholder="Stok" className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white" />
              <Button type="submit" className="h-10 gradient-bg text-white border-0">Ekle</Button>
            </form>

            {products.map((product) => {
              const draft = productDrafts[product.id] ?? {
                name: product.name,
                price: product.price.toFixed(2),
                stock: String(product.stock),
              };

              return (
                <div key={product.id} className="rounded-xl bg-white/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">ID: {product.id}</p>
                    <Badge className={product.isActive ? "bg-green-500/20 text-green-500 border-0" : "bg-yellow-500/20 text-yellow-500 border-0"}>
                      {product.isActive ? "Satista" : "Pasif"}
                    </Badge>
                  </div>

                  <input
                    value={draft.name}
                    onChange={(event) => updateProductDraft(product.id, "name", event.target.value)}
                    placeholder="Urun adi"
                    className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={draft.price}
                      onChange={(event) => updateProductDraft(product.id, "price", event.target.value)}
                      placeholder="Fiyat"
                      className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
                    />
                    <input
                      value={draft.stock}
                      onChange={(event) => updateProductDraft(product.id, "stock", event.target.value)}
                      placeholder="Stok"
                      className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
                    />
                    <div className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-muted-foreground flex items-center">
                      satilan {product.sold}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="gradient-bg text-white border-0" onClick={() => void saveProduct(product.id)}>
                      Kaydet
                    </Button>
                    {!product.isActive && (
                      <Button size="sm" variant="outline" className="border-white/10" onClick={() => void activateProduct(product.id)}>
                        Satisa Ac
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white">DM Satis Akisi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dmOrders.map((order) => (
            <div key={order.id} className="rounded-xl bg-white/5 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-white">{order.buyer}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.productName ?? productById[order.productId]?.name ?? "Urun"} • {order.amount}
                  </p>
                </div>
                <Badge className="bg-orange-500/20 text-orange-500 border-0">{dmStatusLabels[order.status]}</Badge>
              </div>

              {order.paymentLinkUrl && <p className="text-xs text-muted-foreground break-all">{order.paymentLinkUrl}</p>}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="border-white/10" onClick={() => void sendDmPaymentLink(order.id)}>
                  Odeme Linki Gonder
                </Button>
                <Button
                  size="sm"
                  disabled={order.status !== "paid"}
                  className="gradient-bg text-white border-0 disabled:opacity-50"
                  onClick={() => void completeDmPurchase(order.id)}
                >
                  Odeme Sonrasi Tamamla
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Oturum Guvenligi</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            disabled={sessionsLoading || sessionsBusyId === "others"}
            onClick={() => void revokeOtherSessions()}
          >
            Diger Oturumlari Kapat
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsLoading && <p className="text-sm text-muted-foreground">Yukleniyor...</p>}
          {!sessionsLoading && sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">Aktif oturum bulunamadi.</p>
          )}
          {sessions.map((session) => {
            const isRevoked = Boolean(session.revokedAt);
            return (
              <div key={session.id} className="rounded-xl bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white">
                      {session.isCurrent ? "Bu cihaz" : "Diger cihaz"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.userAgent ?? "Bilinmeyen cihaz"}
                    </p>
                  </div>
                  <Badge
                    className={
                      session.isCurrent
                        ? "bg-blue-500/20 text-blue-500 border-0"
                        : isRevoked
                          ? "bg-red-500/20 text-red-500 border-0"
                          : "bg-green-500/20 text-green-500 border-0"
                    }
                  >
                    {session.isCurrent ? "aktif" : isRevoked ? "kapatildi" : "acik"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Son gorulme: {new Date(session.lastSeenAt).toLocaleString("tr-TR")}
                </p>
                <p className="text-xs text-muted-foreground">
                  IP: {session.ipAddress ?? "bilinmiyor"}
                </p>
                {!session.isCurrent && !isRevoked && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={sessionsBusyId === session.id}
                    onClick={() => void revokeSingleSession(session.id)}
                  >
                    Bu Oturumu Kapat
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}

