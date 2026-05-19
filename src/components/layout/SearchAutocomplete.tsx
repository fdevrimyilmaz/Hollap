"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

type ProductResult = {
  id: string;
  name: string;
  creatorName: string;
  thumbnail: string;
  amountCents: number;
  category: string;
};

type CreatorResult = {
  id: string;
  name: string;
  username: string;
  profilePath: string;
  avatar: string;
  category: string;
  productCount: number;
};

type SearchPayload = {
  query: string;
  products: ProductResult[];
  creators: CreatorResult[];
};

type SearchAutocompleteProps = {
  variant?: "header" | "mobile";
  autoFocus?: boolean;
  onClose?: () => void;
};

export function SearchAutocomplete({ variant = "header", autoFocus = false, onClose }: SearchAutocompleteProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchPayload | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setResults(null);
          return;
        }
        const payload = (await response.json()) as SearchPayload;
        setResults(payload);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  // Close on outside click / escape
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        onClose?.();
      }
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed.length > 0 ? `/explore?q=${encodeURIComponent(trimmed)}` : "/explore");
    setIsOpen(false);
    onClose?.();
  };

  const handleSelect = () => {
    setIsOpen(false);
    setValue("");
    onClose?.();
  };

  const hasResults = results && (results.products.length > 0 || results.creators.length > 0);
  const showDropdown = isOpen && value.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={submit} className="relative" role="search">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <Input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={variant === "mobile" ? "Ara…" : "Kurs, yaratıcı veya kategori ara…"}
          aria-label="Site içi arama"
          autoFocus={autoFocus}
          autoComplete="off"
          className={`pl-10 pr-${value ? "10" : "3"} bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 ${
            variant === "mobile" ? "h-11" : "h-10"
          } rounded-xl placeholder:text-muted-foreground/70 text-sm`}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setResults(null);
              setIsOpen(true);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Aramayı temizle"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl glass-card overflow-hidden shadow-2xl shadow-black/40 z-50 max-h-[70vh] overflow-y-auto">
          {isLoading && !results ? (
            <div className="px-4 py-6 flex items-center gap-3 text-sm text-muted-foreground">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
              </svg>
              Aranıyor…
            </div>
          ) : hasResults ? (
            <>
              {results!.creators.length > 0 && (
                <div className="py-2">
                  <p className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Yaratıcılar
                  </p>
                  {results!.creators.map((creator) => (
                    <Link
                      key={creator.id}
                      href={creator.profilePath}
                      onClick={handleSelect}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={creator.avatar} alt={creator.name} />
                        <AvatarFallback className="bg-white/10 text-xs">{creator.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{creator.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{creator.username} · {creator.productCount} ürün
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results!.products.length > 0 && (
                <div className="py-2 border-t border-white/5">
                  <p className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Ürünler
                  </p>
                  {results!.products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/course/${product.id}`}
                      onClick={handleSelect}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <div className="relative w-12 h-9 rounded-md overflow-hidden shrink-0 ring-1 ring-white/5">
                        <Image
                          src={product.thumbnail}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{product.creatorName}</p>
                      </div>
                      <span className="text-sm font-display font-bold text-white tabular-nums shrink-0">
                        ${(product.amountCents / 100).toFixed(0)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <div className="border-t border-white/5">
                <Link
                  href={`/explore?q=${encodeURIComponent(value.trim())}`}
                  onClick={handleSelect}
                  className="flex items-center justify-between px-4 py-3 text-sm text-orange-400 hover:bg-orange-500/5 transition-colors"
                >
                  <span className="font-medium">Tüm sonuçları gör</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-white">&ldquo;{value}&rdquo;</span> için sonuç yok
              </p>
              <Link
                href={`/explore?q=${encodeURIComponent(value.trim())}`}
                onClick={handleSelect}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors mt-2 inline-block"
              >
                Yine de keşfette ara →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
