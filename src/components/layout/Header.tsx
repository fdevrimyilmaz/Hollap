"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsDropdown } from "@/components/Notifications";
import { UserMenu } from "@/components/layout/UserMenu";
import { SearchAutocomplete } from "@/components/layout/SearchAutocomplete";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

const navigation = [
  { name: "Keşfet", href: "/explore" },
  { name: "Kategoriler", href: "/categories" },
  { name: "Yaratıcılar", href: "/creators" },
  { name: "Fiyatlandırma", href: "/pricing" },
];

export function Header() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "glass border-b border-white/10 supports-[backdrop-filter]:bg-black/40"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="Hollap ana sayfa">
            <div className="relative w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-orange-500/30 transition-transform group-hover:scale-105 group-hover:rotate-3">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xl font-display font-bold text-white tracking-tight hidden sm:block">
              Holl<span className="gradient-text">ap</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Ana menü">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full gradient-bg" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
            <SearchAutocomplete />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              onClick={() => setIsSearchOpen((value) => !value)}
              aria-label="Arama"
              aria-expanded={isSearchOpen}
              className="md:hidden p-2.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Language switcher */}
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>

            {/* Notifications (only relevant when logged in; component shows nothing for guests) */}
            <div className="hidden sm:block">
              <NotificationsDropdown />
            </div>

            {/* Auth (UserMenu handles both signed-in and signed-out states) */}
            <UserMenu />

            {/* Mobile Menu */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="lg:hidden p-2.5 rounded-xl hover:bg-white/5 transition-colors ml-0.5"
                  aria-label="Menüyü aç"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] bg-background/95 backdrop-blur-xl border-white/10 p-6">
                <div className="flex flex-col gap-7 mt-2">
                  <Link href="/" onClick={() => setIsMobileOpen(false)} className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-md shadow-orange-500/30">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-lg font-display font-bold text-white">
                      Holl<span className="gradient-text">ap</span>
                    </span>
                  </Link>
                  <nav className="flex flex-col gap-1" aria-label="Mobil menü">
                    {navigation.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={`px-3 py-3 rounded-xl text-base font-medium transition-colors ${
                            isActive
                              ? "bg-orange-500/15 text-orange-400"
                              : "text-white hover:bg-white/5"
                          }`}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                  </nav>
                  <div className="h-px bg-white/10" />
                  <UserMenu variant="mobile" />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <SearchAutocomplete
              variant="mobile"
              autoFocus
              onClose={() => setIsSearchOpen(false)}
            />
          </div>
        )}
      </div>
    </header>
  );
}
