"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ToastProvider";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "creator" | "subscriber" | "admin";
  avatarUrl?: string | null;
};

type UserMenuProps = {
  variant?: "header" | "mobile";
};

export function UserMenu({ variant = "header" }: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setUser(null);
          return;
        }
        const data = (await response.json()) as { user?: AuthUser };
        if (!cancelled) setUser(data.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Çıkış başarısız");
      setUser(null);
      setIsOpen(false);
      showToast.success("Çıkış yapıldı", "Tekrar görüşmek üzere");
      router.push("/");
      router.refresh();
    } catch (error) {
      showToast.error("Çıkış başarısız", error instanceof Error ? error.message : "Bilinmeyen hata");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Loading state: just render a skeleton chip so layout doesn't shift
  if (isLoading) {
    if (variant === "mobile") return null;
    return (
      <div className="flex items-center gap-2">
        <div className="h-9 w-20 rounded-lg bg-white/[0.03] shimmer" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    if (variant === "mobile") {
      return (
        <div className="flex flex-col gap-2">
          <Link href="/login">
            <Button variant="ghost" className="w-full hover:bg-white/5 h-11">Giriş Yap</Button>
          </Link>
          <Link href="/signup">
            <Button className="w-full gradient-bg text-white border-0 h-11 shadow-lg shadow-orange-500/30">
              Ücretsiz Hesap Oluştur
            </Button>
          </Link>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link href="/login" className="hidden sm:inline-flex">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            Giriş
          </Button>
        </Link>
        <Link href="/signup">
          <Button
            size="sm"
            className="gradient-bg hover:opacity-95 text-white border-0 shadow-md shadow-orange-500/25 font-medium"
          >
            Kayıt Ol
          </Button>
        </Link>
      </div>
    );
  }

  // Logged in
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const roleLabel = user.role === "admin" ? "Yönetici" : user.role === "creator" ? "Yaratıcı" : "Öğrenci";

  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/[0.03] border border-white/5">
          <Avatar className="w-10 h-10 ring-2 ring-orange-500/40">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
            <AvatarFallback className="bg-orange-500/15 text-orange-400 text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{roleLabel}</p>
          </div>
        </div>
        <Link href="/dashboard">
          <Button className="w-full gradient-bg text-white border-0 h-11 font-medium">Panele Git</Button>
        </Link>
        <Link href="/dashboard/settings">
          <Button variant="outline" className="w-full border-white/15 hover:bg-white/5 h-11">
            Ayarlar
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-300 h-11"
          disabled={isLoggingOut}
          onClick={handleLogout}
        >
          {isLoggingOut ? "Çıkış yapılıyor…" : "Çıkış Yap"}
        </Button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Avatar className="w-7 h-7 ring-1 ring-orange-500/40">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
          <AvatarFallback className="bg-orange-500/15 text-orange-400 text-[11px] font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden lg:block text-sm font-medium text-white truncate max-w-[7rem]">
          {user.name.split(" ")[0]}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl glass-card shadow-2xl shadow-black/40 overflow-hidden animate-fade-in"
        >
          <div className="px-4 py-3.5 border-b border-white/5">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <span className="inline-block mt-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-semibold">
              {roleLabel}
            </span>
          </div>
          <nav className="py-1.5">
            <MenuLink href="/dashboard" onClick={() => setIsOpen(false)} icon="dashboard">
              Panel
            </MenuLink>
            <MenuLink href="/dashboard/messages" onClick={() => setIsOpen(false)} icon="message">
              Mesajlar
            </MenuLink>
            {user.role === "creator" ? (
              <>
                <MenuLink href="/dashboard/content" onClick={() => setIsOpen(false)} icon="content">
                  İçeriklerim
                </MenuLink>
                <MenuLink href="/dashboard/subscribers" onClick={() => setIsOpen(false)} icon="users">
                  Aboneler
                </MenuLink>
                <MenuLink href="/dashboard/analytics" onClick={() => setIsOpen(false)} icon="chart">
                  Analizler
                </MenuLink>
              </>
            ) : (
              <>
                <MenuLink href="/courses" onClick={() => setIsOpen(false)} icon="book">
                  Kurslarım
                </MenuLink>
                <MenuLink href="/dashboard/bookmarks" onClick={() => setIsOpen(false)} icon="bookmark">
                  Kayıtlarım
                </MenuLink>
                <MenuLink href="/dashboard/notifications" onClick={() => setIsOpen(false)} icon="bell">
                  Bildirimler
                </MenuLink>
              </>
            )}
            <MenuLink href="/dashboard/settings" onClick={() => setIsOpen(false)} icon="settings">
              Ayarlar
            </MenuLink>
            {user.role === "admin" && (
              <MenuLink href="/admin" onClick={() => setIsOpen(false)} icon="shield">
                Yönetim Paneli
              </MenuLink>
            )}
          </nav>
          <div className="border-t border-white/5 py-1.5">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {isLoggingOut ? "Çıkış yapılıyor…" : "Çıkış Yap"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: "dashboard" | "content" | "users" | "chart" | "settings" | "book" | "bell" | "message" | "shield" | "bookmark";
  children: React.ReactNode;
}) {
  const icons = {
    dashboard: (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
    content: <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
    users: <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    chart: <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    settings: (
      <>
        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </>
    ),
    book: <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
    bell: <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    message: <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
    shield: <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    bookmark: <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />,
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
      role="menuitem"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {icons[icon]}
      </svg>
      {children}
    </Link>
  );
}
