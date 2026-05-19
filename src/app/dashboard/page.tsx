"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FileUpload } from "@/components/ui/file-upload";
import { PayoutsCard } from "@/components/dashboard/PayoutsCard";
import { showToast } from "@/components/ToastProvider";
import { NotificationsDropdown } from "@/components/Notifications";
import { useNotificationCenter } from "@/components/NotificationCenter";
import { cn } from "@/lib/utils";

type StatItem = { label: string; value: string; change: string };
type SaleItem = { name: string; product: string; amount: string; time: string };
type LiveSession = {
  id: string;
  title: string;
  schedule: string;
  booked: number;
  total: number;
  isLive: boolean;
  streamKey: string | null;
  ingestUrl: string | null;
  playbackUrl: string | null;
};
type Product = { id: string; name: string; price: number; stock: number; sold: number; isActive: boolean; thumbnailUrl?: string | null };
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
  pending: "Bekliyor",
  payment_link_sent: "Ödeme linki gönderildi",
  paid: "Ödendi",
  completed: "Tamamlandı",
  failed: "Başarısız",
  refunded: "İade",
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `İstek başarısız (${response.status})`;
  } catch {
    return `İstek başarısız (${response.status})`;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { refreshNotifications } = useNotificationCenter();

  // Kullanıcı bilgisini (rolü dahil) tutan state
  const [user, setUser] = useState<{ name: string; role: 'creator' | 'subscriber' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          router.push("/login");
          return;
        }

        const data = (await response.json()) as { user?: { name: string; role: "creator" | "subscriber" } };
        if (!data.user) {
          router.push("/login");
          return;
        }

        setUser(data.user);
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchUser();
  }, [router]);

  const sidebarItems = useMemo(() => {
    if (!user) return [];

    const items = [
      { icon: LayoutDashboard, label: "Panel", href: "/dashboard", roles: ["creator", "subscriber"] },
      { icon: MessageSquare, label: "Mesajlar", href: "/dashboard/messages", roles: ["creator", "subscriber"] },
      { icon: BookOpen, label: "İçeriklerim", href: "/dashboard/content", roles: ["creator"] },
      { icon: BookOpen, label: "Dersler", href: "/dashboard/lessons", roles: ["creator"] },
      { icon: BookOpen, label: "Kurslarım", href: "/courses", roles: ["subscriber"] },
      { icon: Users, label: "Aboneler", href: "/dashboard/subscribers", roles: ["creator"] },
      { icon: BarChart3, label: "Analizler", href: "/dashboard/analytics", roles: ["creator"] },
      { icon: Bell, label: "Bildirimler", href: "/dashboard/notifications", roles: ["subscriber"] },
      { icon: Settings, label: "Ayarlar", href: "/dashboard/settings", roles: ["creator", "subscriber"] },
    ];

    // Kullanıcının rolüne göre menü öğelerini filtrele
    return items.filter((item) => item.roles.includes(user.role));
  }, [user]);

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
  const [newLiveTitle, setNewLiveTitle] = useState("");
  const [newLiveSchedule, setNewLiveSchedule] = useState("Şimdi");
  const [isCreatingLive, setIsCreatingLive] = useState(false);
  const [revealedStreamKey, setRevealedStreamKey] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("19.99");
  const [newProductStock, setNewProductStock] = useState("50");
  const [productDrafts, setProductDrafts] = useState<Record<string, ProductDraft>>({});
  const isCreator = user?.role === "creator";

  const uploadProductThumbnail = useCallback(async (productId: string, file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Resim okunamadı"));
      reader.readAsDataURL(file);
    });

    const response = await fetch(`/api/dashboard/products/${productId}/thumbnail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: dataUrl }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Görsel kaydedilemedi");
    }

    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, thumbnailUrl: dataUrl } : product,
      ),
    );
    showToast.success("Görsel güncellendi", "Ürün thumbnail'i kaydedildi");
  }, []);

  const removeProductThumbnail = useCallback(async (productId: string) => {
    const response = await fetch(`/api/dashboard/products/${productId}/thumbnail`, {
      method: "DELETE",
    });
    if (!response.ok) {
      showToast.error("Görsel kaldırılamadı", "Lütfen tekrar deneyin");
      return;
    }
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, thumbnailUrl: null } : product,
      ),
    );
    showToast.success("Görsel kaldırıldı", "Varsayılan thumbnail'e dönüldü");
  }, []);

  const productById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product])) as Record<string, Product>,
    [products]
  );

  const loadDashboard = useCallback(async () => {
    setIsDashboardLoading(true);
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
      showToast.error("Panel yüklenemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setIsDashboardLoading(false);
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
      showToast.error("Oturumlar yüklenemedi", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role !== "creator") {
      setStats([]);
      setRecentSales([]);
      setLiveSessions([]);
      setProducts([]);
      setDmOrders([]);
      setSentFilesLog([]);
      return;
    }

    void loadDashboard();
  }, [loadDashboard, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadSessions();
  }, [loadSessions, user]);

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
        showToast.error("Dosya gönderimi başarısız", await readErrorMessage(prepareResponse));
        return;
      }

      const preparePayload = (await prepareResponse.json()) as { uploads?: PreparedUploadPlan[] };
      const uploads = preparePayload.uploads ?? [];

      if (uploads.length !== selectedFiles.length) {
        showToast.error("Dosya gönderimi başarısız", "Yükleme planı oluşturulamadı");
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
          const reason = detail.trim() || `Yükleme başarısız (${uploadResponse.status})`;
          showToast.error("Dosya yükleme başarısız", reason);
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
        showToast.error("Dosya gönderimi başarısız", await readErrorMessage(finalizeResponse));
        return;
      }

      await Promise.all([loadDashboard(), refreshNotifications()]);
      showToast.success("Dosyalar gönderildi", "Yetkili abonelere dağıtıldı");
      setSelectedFiles([]);
    } finally {
      setIsSendingFiles(false);
    }
  };

  const createLiveSession = async (event: FormEvent) => {
    event.preventDefault();
    const title = newLiveTitle.trim();
    if (!title) return;

    setIsCreatingLive(true);
    try {
      const response = await fetch("/api/dashboard/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, schedule: newLiveSchedule.trim() || "Şimdi" }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Oturum oluşturulamadı");
      }
      setNewLiveTitle("");
      setNewLiveSchedule("Şimdi");
      await loadDashboard();
      showToast.success("Canlı yayın hazır", `"${title}" oturumu listene eklendi.`);
    } catch (error) {
      showToast.error(
        "Oturum oluşturulamadı",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsCreatingLive(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast.success("Kopyalandı", label);
    } catch {
      showToast.error("Kopyalanamadı", "Tarayıcın panoya erişime izin vermedi");
    }
  };

  const toggleLive = async (sessionId: string) => {
    const response = await fetch(`/api/dashboard/live/${sessionId}/toggle`, { method: "POST" });
    if (!response.ok) {
      showToast.error("Canlı yayın güncellenemedi", await readErrorMessage(response));
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
      showToast.error("Ürün eklenemedi", await readErrorMessage(response));
      return;
    }

    setNewProductName("");
    setNewProductPrice("19.99");
    setNewProductStock("50");
    await loadDashboard();
    showToast.success("Ürün eklendi", "Kayıt başarıyla oluşturuldu");
  };
  const activateProduct = async (productId: string) => {
    const response = await fetch(`/api/dashboard/products/${productId}/activate`, { method: "POST" });
    if (!response.ok) {
      showToast.error("Ürün aktif edilemedi", await readErrorMessage(response));
      return;
    }

    await loadDashboard();
  };

  const saveProduct = async (productId: string) => {
    const draft = productDrafts[productId];
    if (!draft) {
      showToast.warning("Ürün bulunamadı", "Lütfen tekrar deneyin");
      return;
    }

    const name = draft.name.trim();
    const price = Number(draft.price);
    const stock = Number(draft.stock);

    if (!name || Number.isNaN(price) || price <= 0 || Number.isNaN(stock) || stock < 0) {
      showToast.warning("Geçersiz ürün bilgisi", "Ad, fiyat ve stok değerlerini kontrol edin");
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
      showToast.error("Ürün güncellenemedi", await readErrorMessage(response));
      return;
    }

    await loadDashboard();
    showToast.success("Ürün güncellendi", "Fiyatlandırma değişiklikleri kaydedildi");
  };

  const sendDmPaymentLink = async (orderId: string) => {
    const response = await fetch(`/api/dashboard/dm-orders/${orderId}/payment-link`, {
      method: "POST",
      headers: {
        "X-Idempotency-Key": `dm_${orderId}_${crypto.randomUUID()}`,
      },
    });
    if (!response.ok) {
      showToast.error("Ödeme linki oluşturulamadı", await readErrorMessage(response));
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
      showToast.error("Sipariş tamamlanamadı", await readErrorMessage(response));
      return;
    }

    await Promise.all([loadDashboard(), refreshNotifications()]);
    showToast.success("DM siparişi tamamlandı", "Ödeme sonrası teslim kaydı oluşturuldu");
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
      showToast.success("Oturum sonlandırıldı", "Seçilen cihazın oturumu kapatıldı");
    } catch (error) {
      showToast.error("Oturum kapatılamadı", error instanceof Error ? error.message : "Bilinmeyen hata");
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
      showToast.success("Diğer oturumlar kapatıldı", "Sadece bu cihazdaki oturum açık kaldı");
    } catch (error) {
      showToast.error("Oturumlar kapatılamadı", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setSessionsBusyId(null);
    }
  };

  const logout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      showToast.error("Çıkış yapılamadı", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-orange-500/30">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="text-lg font-display font-bold tracking-tight">
            Holl<span className="gradient-text">ap</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                isActive
                  ? "bg-orange-500/15 text-orange-400 font-medium"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-orange-400" : "group-hover:text-white")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={() => void logout()}
          className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-colors disabled:opacity-60"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">{isLoggingOut ? "Çıkış yapılıyor…" : "Çıkış Yap"}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white md:flex">
      {/* Desktop sidebar */}
      <aside className="w-60 border-r border-white/5 bg-black/30 backdrop-blur-xl hidden md:flex flex-col shrink-0 sticky top-0 h-screen">
        <SidebarNav />
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-30 pointer-events-none" />

        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-3 px-4 h-14 border-b border-white/10 bg-black/60 backdrop-blur-xl">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Menü"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-[#0A0A0B] border-white/10 flex flex-col">
              <SidebarNav />
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <span className="text-white font-bold text-xs">H</span>
            </div>
            <span className="text-base font-display font-bold tracking-tight text-white">
              Holl<span className="gradient-text">ap</span>
            </span>
          </Link>
          <NotificationsDropdown />
        </div>

        <div className="p-4 sm:p-6 lg:p-8 relative z-10 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isCreator
              ? isDashboardLoading
                ? "Yükleniyor…"
                : "Tüm veriler canlı olarak güncelleniyor"
              : "Abonelik paneliniz hazır"}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
              Ana Sayfa
            </Button>
          </Link>
          <NotificationsDropdown />
        </div>
      </div>


      {/* ROL KONTROLÜ BURADA YAPILIYOR */}
      {isCreator ? (
        <CreatorDashboardView stats={stats} />
      ) : (
        <SubscriberDashboardView />
      )}

      {isCreator && (
        <>
      <PayoutsCard />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Son Satışlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSales.length === 0 && <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>}
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
            <CardTitle className="text-white">Abonelere Dosya Gönderimi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
              value={fileAudience}
              onChange={(event) => setFileAudience(event.target.value)}
            >
              <option value="tum-aboneler" className="bg-card">Tüm aboneler</option>
              <option value="vip" className="bg-card">VIP aboneler</option>
              <option value="yeni" className="bg-card">Yeni aboneler</option>
            </select>

            <FileUpload
              preset="any"
              multiple
              compact
              maxBytes={500 * 1024 * 1024}
              isBusy={isSendingFiles}
              onFiles={(files) => setSelectedFiles(files)}
              hint="Birden fazla dosya seçebilirsin · maks 500 MB / dosya"
            />

            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file) => (
                  <Badge key={`${file.name}-${file.size}`} variant="outline" className="border-white/10 text-xs font-medium">
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
              {isSendingFiles ? "Yükleniyor…" : "Dosyaları Gönder"}
            </Button>

            {sentFilesLog.map((log, index) => (
              <div key={`${log.time}-${index}`} className="rounded-xl bg-white/5 p-3">
                <p className="text-sm text-white">{log.filesCount} dosya gönderildi</p>
                <p className="text-xs text-muted-foreground">{log.audience} • {log.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Canlı Yayınlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={(event) => void createLiveSession(event)} className="grid grid-cols-[1fr_120px_auto] gap-2">
              <input
                value={newLiveTitle}
                onChange={(event) => setNewLiveTitle(event.target.value)}
                placeholder="Yayın başlığı"
                className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
              />
              <input
                value={newLiveSchedule}
                onChange={(event) => setNewLiveSchedule(event.target.value)}
                placeholder="Zaman"
                className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
              />
              <Button
                type="submit"
                disabled={isCreatingLive || !newLiveTitle.trim()}
                className="h-10 gradient-bg text-white border-0 font-medium disabled:opacity-50"
              >
                {isCreatingLive ? "…" : "Oluştur"}
              </Button>
            </form>

            {liveSessions.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                Henüz canlı oturum yok. Yukarıdan ilk yayınını oluştur.
              </p>
            )}

            {liveSessions.map((session) => {
              const progressPct = session.total > 0 ? Math.round((session.booked / session.total) * 100) : 0;
              const isKeyRevealed = revealedStreamKey === session.id;
              return (
                <div key={session.id} className="rounded-xl bg-white/5 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground">{session.schedule}</p>
                    </div>
                    <Badge className={session.isLive ? "bg-red-500/20 text-red-400 border border-red-500/30 font-medium" : "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium"}>
                      {session.isLive ? "🔴 CANLI" : "Hazır"}
                    </Badge>
                  </div>

                  {session.total > 0 && (
                    <div className="flex items-center gap-2">
                      <Progress value={progressPct} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums">{session.booked}/{session.total}</span>
                    </div>
                  )}

                  {session.streamKey && session.ingestUrl && (
                    <div className="rounded-lg bg-black/40 border border-white/10 p-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        OBS / yayıncı ayarları
                      </p>
                      <div className="grid grid-cols-[80px_1fr_auto] items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Ingest</span>
                        <code className="text-white font-mono text-[11px] truncate">{session.ingestUrl}</code>
                        <button
                          type="button"
                          onClick={() => void copyToClipboard(session.ingestUrl!, "Yayın URL'i kopyalandı")}
                          className="text-orange-400 hover:text-orange-300 text-xs"
                        >
                          Kopyala
                        </button>
                      </div>
                      <div className="grid grid-cols-[80px_1fr_auto] items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Key</span>
                        <code className="text-white font-mono text-[11px] truncate">
                          {isKeyRevealed ? session.streamKey : "•".repeat(Math.min(20, session.streamKey.length))}
                        </code>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setRevealedStreamKey(isKeyRevealed ? null : session.id)}
                            className="text-muted-foreground hover:text-white text-xs"
                          >
                            {isKeyRevealed ? "Gizle" : "Göster"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void copyToClipboard(session.streamKey!, "Stream key kopyalandı")}
                            className="text-orange-400 hover:text-orange-300 text-xs"
                          >
                            Kopyala
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Button size="sm" className={session.isLive ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30" : "gradient-bg text-white border-0"} onClick={() => void toggleLive(session.id)}>
                      {session.isLive ? "Yayını Bitir" : "Yayını Başlat"}
                    </Button>
                    {session.isLive && (
                      <Button asChild size="sm" variant="outline" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06]">
                        <Link href={`/live/${session.id}`}>İzleyici görünümü</Link>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Ürünler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={(event) => void addProduct(event)} className="grid grid-cols-3 gap-2">
              <input value={newProductName} onChange={(event) => setNewProductName(event.target.value)} placeholder="Ürün adı" className="col-span-3 h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white" />
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
                  <div className="flex items-start gap-3">
                    <ProductThumbnailEditor
                      productId={product.id}
                      thumbnailUrl={product.thumbnailUrl ?? null}
                      onUpload={uploadProductThumbnail}
                      onRemove={removeProductThumbnail}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <p className="text-xs text-muted-foreground truncate font-mono">{product.id.slice(0, 14)}…</p>
                        <Badge className={product.isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}>
                          {product.isActive ? "Satışta" : "Pasif"}
                        </Badge>
                      </div>
                      <input
                        value={draft.name}
                        onChange={(event) => updateProductDraft(product.id, "name", event.target.value)}
                        placeholder="Ürün adı"
                        className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white"
                      />
                    </div>
                  </div>

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
                    <div className="h-10 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-muted-foreground flex items-center tabular-nums">
                      Satılan: {product.sold}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="gradient-bg text-white border-0" onClick={() => void saveProduct(product.id)}>
                      Kaydet
                    </Button>
                    <Button asChild size="sm" variant="outline" className="border-white/10 hover:bg-white/5">
                      <Link href={`/dashboard/lessons?product=${product.id}`}>Dersleri Yönet</Link>
                    </Button>
                    {!product.isActive && (
                      <Button size="sm" variant="outline" className="border-white/10" onClick={() => void activateProduct(product.id)}>
                        Satışa Aç
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
          <CardTitle className="text-white">DM Satış Akışı</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dmOrders.map((order) => (
            <div key={order.id} className="rounded-xl bg-white/5 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-white">{order.buyer}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.productName ?? productById[order.productId]?.name ?? "Ürün"} • {order.amount}
                  </p>
                </div>
                <Badge className="bg-orange-500/15 text-orange-300 border border-orange-500/20">{dmStatusLabels[order.status]}</Badge>
              </div>

              {order.paymentLinkUrl && <p className="text-xs text-muted-foreground break-all">{order.paymentLinkUrl}</p>}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="border-white/10" onClick={() => void sendDmPaymentLink(order.id)}>
                  Ödeme Linki Gönder
                </Button>
                <Button
                  size="sm"
                  disabled={order.status !== "paid"}
                  className="gradient-bg text-white border-0 disabled:opacity-50"
                  onClick={() => void completeDmPurchase(order.id)}
                >
                  Ödeme Sonrası Tamamla
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
        </>
      )}

      <Card className="glass-card border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Oturum Güvenliği</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            disabled={sessionsLoading || sessionsBusyId === "others"}
            onClick={() => void revokeOtherSessions()}
          >
            Diğer Oturumları Kapat
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsLoading && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}
          {!sessionsLoading && sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">Aktif oturum bulunamadı.</p>
          )}
          {sessions.map((session) => {
            const isRevoked = Boolean(session.revokedAt);
            return (
              <div key={session.id} className="rounded-xl bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white">
                      {session.isCurrent ? "Bu cihaz" : "Diğer cihaz"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.userAgent ?? "Bilinmeyen cihaz"}
                    </p>
                  </div>
                  <Badge
                    className={
                      session.isCurrent
                        ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                        : isRevoked
                          ? "bg-red-500/15 text-red-300 border border-red-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    }
                  >
                    {session.isCurrent ? "Aktif" : isRevoked ? "Kapatıldı" : "Açık"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Son görülme: {new Date(session.lastSeenAt).toLocaleString("tr-TR")}
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
        </div>
      </main>
    </div>
  );
}

// --- Yardımcı Bileşenler ---

function ProductThumbnailEditor({
  productId,
  thumbnailUrl,
  onUpload,
  onRemove,
}: {
  productId: string;
  thumbnailUrl: string | null;
  onUpload: (productId: string, file: File) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast.error("Geçersiz dosya", "Yalnızca resim kabul edilir");
      return;
    }
    if (file.size > 2_500_000) {
      showToast.error("Dosya çok büyük", "Maks 2.5 MB");
      return;
    }
    setIsBusy(true);
    try {
      await onUpload(productId, file);
    } catch (error) {
      showToast.error("Yükleme başarısız", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setIsBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isBusy}
        aria-label="Ürün görseli"
        className="relative w-20 h-14 rounded-lg overflow-hidden ring-1 ring-white/10 bg-white/5 hover:ring-orange-500/50 transition-all group disabled:opacity-60"
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
          {isBusy ? (
            <svg className="w-4 h-4 text-white animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          )}
        </div>
      </button>
      {thumbnailUrl && !isBusy && (
        <button
          type="button"
          onClick={() => void onRemove(productId)}
          className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors mt-1.5 block mx-auto"
        >
          Kaldır
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleSelect(file);
        }}
      />
    </div>
  );
}

// --- Rol Bazlı Bileşenler (Geçici Tanımlar) ---

function CreatorDashboardView({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-card border-white/10">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</p>
            <p className="text-2xl font-display font-bold text-white mt-1.5 tabular-nums">{stat.value}</p>
            <Badge className="mt-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">{stat.change}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SubscriberDashboardView() {
  const quickLinks = [
    {
      title: "Keşfet",
      description: "Tüm marketplace ürünlerini gez",
      href: "/explore",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      tint: "from-orange-500/20 to-amber-500/10 text-orange-400",
    },
    {
      title: "Yaratıcılar",
      description: "Takip etmek istediklerini bul",
      href: "/creators",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      tint: "from-blue-500/20 to-cyan-500/10 text-blue-400",
    },
    {
      title: "Kategoriler",
      description: "İlgi alanına göre filtrele",
      href: "/categories",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      tint: "from-emerald-500/20 to-teal-500/10 text-emerald-400",
    },
    {
      title: "Yeni İçerikler",
      description: "Son eklenen ürünler",
      href: "/new",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      tint: "from-purple-500/20 to-pink-500/10 text-purple-400",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/10 overflow-hidden relative">
        <div className="absolute inset-0 mesh-gradient opacity-50 pointer-events-none" />
        <CardContent className="p-6 lg:p-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="max-w-xl">
              <Badge className="mb-3 gradient-bg border-0 text-white font-semibold shadow-md shadow-orange-500/25">
                Hoş geldin
              </Badge>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight mb-2">
                Bilgi yolculuğuna devam et
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aldığın kurslar, takip ettiğin yaratıcılar ve önerilen içerikler burada toplanır.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button asChild className="gradient-bg text-white border-0 shadow-lg shadow-orange-500/25 font-medium">
                <Link href="/explore">Keşfetmeye Başla</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 font-medium">
                <Link href="/become-creator">Yaratıcı Ol</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.title} href={link.href} className="group block">
            <div className="glass-card rounded-2xl p-5 card-hover h-full">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${link.tint} flex items-center justify-center mb-4`}>
                {link.icon}
              </div>
              <h3 className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors">
                {link.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="glass-card border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white text-base">Kurslarım</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Henüz kurs satın almadın</p>
              <p className="text-xs text-muted-foreground/70 mb-4">İlk kursunla bilgi yolculuğun başlasın</p>
              <Button asChild size="sm" className="gradient-bg text-white border-0">
                <Link href="/courses">Kursları İncele</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Bildirimler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-white font-medium">Anlık güncellemeler</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Yeni içerik, DM ödeme ve duyurular için bildirimleri açık tut.
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="w-full border-white/10 hover:bg-white/5 hover:border-white/20 font-medium">
              <Link href="/dashboard/notifications">Bildirimleri Gör</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
