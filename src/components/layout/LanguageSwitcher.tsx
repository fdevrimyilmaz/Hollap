"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/dictionaries";
import { useTranslation } from "@/lib/i18n/context";

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium uppercase text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Dil seç"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        {locale}
      </button>

      {isOpen && (
        <div role="menu" className="absolute right-0 mt-1.5 w-32 rounded-xl glass-card shadow-2xl shadow-black/40 overflow-hidden animate-fade-in">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLocale(l);
                setIsOpen(false);
              }}
              role="menuitem"
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                l === locale
                  ? "bg-orange-500/15 text-orange-400"
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-[10px] uppercase tabular-nums mr-2 opacity-70">{l}</span>
              {LOCALE_LABELS[l as Locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
