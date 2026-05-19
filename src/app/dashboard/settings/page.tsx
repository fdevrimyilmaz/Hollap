"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileUpload } from "@/components/ui/file-upload";
import { ImageCropper } from "@/components/ui/image-cropper";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";
import { showToast } from "@/components/ToastProvider";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "creator" | "subscriber";
  avatarUrl?: string | null;
  coverUrl?: string | null;
};

const MAX_AVATAR_SIZE_BYTES = 800 * 1024;
const MAX_COVER_SIZE_BYTES = 2 * 1024 * 1024;

const roleLabel: Record<AuthUser["role"], string> = {
  creator: "Yaratıcı",
  subscriber: "Öğrenci",
};

export default function DashboardSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cropTarget, setCropTarget] = useState<"avatar" | "cover" | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  // Load /api/auth/me again on settings to pick up coverUrl
  // (initial /me returns it now, but keep this defensive in case schema changes)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          router.push("/login");
          return;
        }
        const payload = (await response.json()) as { user?: AuthUser };
        if (!payload.user) {
          router.push("/login");
          return;
        }
        setUser(payload.user);
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    void loadUser();
  }, [router]);

  const handlePasswordReset = useCallback(async () => {
    if (!user) return;
    setIsRequestingReset(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      showToast.success(
        "Bağlantı gönderildi",
        payload.message ?? "Şifre sıfırlama bağlantısı e-postana gönderildi.",
      );
    } catch (error) {
      showToast.error(
        "Bağlantı gönderilemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsRequestingReset(false);
    }
  }, [user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Çıkış başarısız");
      showToast.success("Çıkış yapıldı", "Görüşmek üzere");
      router.push("/");
      router.refresh();
    } catch (error) {
      showToast.error(
        "Çıkış başarısız",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSavePreferences = () => {
    showToast.success("Tercihler kaydedildi", "Yeni bildirim ayarların aktif.");
  };

  // Selecting a file just opens the cropper; the actual upload happens after crop.
  const openCropperWithFile = (target: "avatar" | "cover", file: File, maxBytes: number) => {
    if (!file.type.startsWith("image/")) {
      showToast.error("Geçersiz dosya", "Lütfen bir resim dosyası seç.");
      return;
    }
    if (file.size > maxBytes * 4) {
      // Raw input limit is generous because the cropper will downscale to outputSize.
      showToast.error("Dosya çok büyük", `Maksimum ${Math.round((maxBytes * 4) / (1024 * 1024))} MB olabilir.`);
      return;
    }
    setCropTarget(target);
    setCropFile(file);
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    openCropperWithFile("avatar", file, MAX_AVATAR_SIZE_BYTES);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handleCoverUpload = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    openCropperWithFile("cover", file, MAX_COVER_SIZE_BYTES);
  };

  const submitCroppedImage = async (dataUrl: string) => {
    if (!cropTarget) return;
    const endpoint = cropTarget === "avatar" ? "/api/account/avatar" : "/api/account/cover";
    const setBusy = cropTarget === "avatar" ? setIsUploadingAvatar : setIsUploadingCover;
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dataUrl }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Yükleme başarısız");
      }
      setUser((prev) =>
        prev
          ? cropTarget === "avatar"
            ? { ...prev, avatarUrl: dataUrl }
            : { ...prev, coverUrl: dataUrl }
          : prev,
      );
      showToast.success(
        cropTarget === "avatar" ? "Avatar güncellendi" : "Kapak güncellendi",
        "Değişiklik kaydedildi",
      );
      router.refresh();
    } catch (error) {
      showToast.error(
        "Yüklenemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setBusy(false);
      setCropTarget(null);
      setCropFile(null);
    }
  };

  const handleRemoveCover = async () => {
    setIsUploadingCover(true);
    try {
      const response = await fetch("/api/account/cover", { method: "DELETE" });
      if (!response.ok) throw new Error("Kapak kaldırılamadı");
      setUser((prev) => (prev ? { ...prev, coverUrl: null } : prev));
      showToast.success("Kapak kaldırıldı", "Varsayılan görüntüye dönüldü");
      router.refresh();
    } catch (error) {
      showToast.error(
        "İşlem başarısız",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const response = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!response.ok) throw new Error("Avatar kaldırılamadı");
      setUser((prev) => (prev ? { ...prev, avatarUrl: null } : prev));
      showToast.success("Avatar kaldırıldı", "Varsayılan görüntüye dönüldü");
      router.refresh();
    } catch (error) {
      showToast.error(
        "İşlem başarısız",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading || !user) {
    return (
      <main className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </main>
    );
  }

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Ayarlar</h1>
            <p className="text-sm text-muted-foreground mt-1">Hesap, güvenlik ve bildirim tercihlerin.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
            <Link href="/dashboard">← Panele Dön</Link>
          </Button>
        </div>

        {/* Hesap profili */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-5">
              <div className="relative shrink-0">
                <Avatar className="w-20 h-20 ring-2 ring-orange-500/30">
                  {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
                  <AvatarFallback className="bg-orange-500/15 text-orange-400 text-xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full gradient-bg text-white flex items-center justify-center shadow-lg shadow-orange-500/30 hover:opacity-95 transition-opacity disabled:opacity-50"
                  aria-label="Profil fotoğrafını değiştir"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleAvatarSelect(event)}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white truncate">{user.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <Badge className="mt-2 bg-orange-500/15 text-orange-400 border border-orange-500/30 font-medium text-xs">
                  {roleLabel[user.role]}
                </Badge>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25 font-medium"
                  >
                    {isUploadingAvatar ? "Yükleniyor…" : user.avatarUrl ? "Fotoğrafı Değiştir" : "Fotoğraf Yükle"}
                  </Button>
                  {user.avatarUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleRemoveAvatar()}
                      disabled={isUploadingAvatar}
                      className="text-muted-foreground hover:text-red-400 hover:bg-red-500/5 font-medium"
                    >
                      Kaldır
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/70 mt-2">PNG, JPG, WEBP — maks 800 KB</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kapak fotoğrafı */}
        {user.role === "creator" && (
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Profil Kapak Fotoğrafı</CardTitle>
            </CardHeader>
            <CardContent>
              {user.coverUrl && (
                <div className="mb-4 rounded-2xl overflow-hidden ring-1 ring-white/10 aspect-[3/1] relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={user.coverUrl} alt="Mevcut kapak" className="w-full h-full object-cover" />
                </div>
              )}
              <FileUpload
                preset="image"
                maxBytes={MAX_COVER_SIZE_BYTES}
                onFiles={handleCoverUpload}
                onClear={user.coverUrl ? () => void handleRemoveCover() : undefined}
                previewSrc={user.coverUrl ?? null}
                isBusy={isUploadingCover}
                hint="Yatay 3:1 görsel önerilir. PNG, JPG veya WebP — maks 2 MB."
              />
            </CardContent>
          </Card>
        )}

        {/* Güvenlik */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Güvenlik</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Şifre</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  E-postana güvenli bir sıfırlama bağlantısı göndereceğiz.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => void handlePasswordReset()}
                disabled={isRequestingReset}
                className="gradient-bg text-white border-0 font-medium shrink-0"
              >
                {isRequestingReset ? "Gönderiliyor…" : "Sıfırlama Gönder"}
              </Button>
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Aktif oturumlar</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Diğer cihazlardaki oturumlarını paneldeki güvenlik bölümünden kapatabilirsin.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="border-white/15 bg-white/[0.02] hover:bg-white/[0.06] shrink-0">
                <Link href="/dashboard">Panele Git</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bildirim tercihleri */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Bildirim Tercihleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PushNotificationToggle />
            <ToggleRow
              label="E-posta bildirimleri"
              description="Önemli güncellemeler ve sipariş bilgileri için e-posta al."
              checked={emailNotifications}
              onChange={setEmailNotifications}
            />
            <ToggleRow
              label="Pazarlama e-postaları"
              description="Yeni kurs ve kampanyalardan haberdar ol."
              checked={marketingEmails}
              onChange={setMarketingEmails}
            />
            <div className="flex justify-end pt-2">
              <Button onClick={handleSavePreferences} size="sm" className="gradient-bg text-white border-0 font-medium">
                Tercihleri Kaydet
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tehlikeli bölge */}
        <Card className="glass-card border-red-500/20">
          <CardHeader>
            <CardTitle className="text-white text-base">Hesap İşlemleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">Çıkış yap</p>
                <p className="text-xs text-muted-foreground mt-1">Sadece bu cihazdaki oturumu kapatır.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300 shrink-0 font-medium"
              >
                {isLoggingOut ? "Çıkılıyor…" : "Çıkış Yap"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ImageCropper
        open={Boolean(cropFile && cropTarget)}
        file={cropFile}
        aspect={cropTarget === "cover" ? 3 : 1}
        outputSize={cropTarget === "cover" ? 1200 : 512}
        outputMimeType="image/jpeg"
        title={cropTarget === "cover" ? "Kapak Fotoğrafını Kırp" : "Avatarı Kırp"}
        onCancel={() => {
          setCropFile(null);
          setCropTarget(null);
        }}
        onConfirm={({ dataUrl }) => void submitCroppedImage(dataUrl)}
      />
    </main>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const labelId = `toggle-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div
      className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
      onClick={() => onChange(!checked)}
      role="presentation"
    >
      <div className="min-w-0 cursor-pointer">
        <p id={labelId} className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={(event) => {
          event.stopPropagation();
          onChange(!checked);
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors mt-0.5 ${
          checked ? "bg-orange-500" : "bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          } shadow-md`}
        />
      </button>
    </div>
  );
}
