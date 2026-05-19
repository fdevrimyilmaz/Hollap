"use client";

import { use, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showToast } from "@/components/ToastProvider";

function LivePlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isHls = src.endsWith(".m3u8") || src.includes(".m3u8?");
    const state = { cancelled: false, cleanup: undefined as (() => void) | undefined };

    if (isHls) {
      // Safari has native HLS; everyone else needs hls.js
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        void import("hls.js").then((mod) => {
          if (state.cancelled) return;
          const Hls = mod.default;
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true });
            hls.loadSource(src);
            hls.attachMedia(video);
            state.cleanup = () => hls.destroy();
          } else {
            // Fallback: hope the browser handles it
            video.src = src;
          }
        });
      }
    } else {
      video.src = src;
    }

    return () => {
      state.cancelled = true;
      state.cleanup?.();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      playsInline
      muted
      className="w-full max-h-full"
    />
  );
}

type LiveSession = {
  id: string;
  title: string;
  schedule: string;
  booked: number;
  total: number;
  status: string;
  isLive: boolean;
  playbackUrl: string | null;
  creator: { id: string; name: string; avatarUrl: string | null } | null;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  flagged: boolean;
  createdAt: string;
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function timeOf(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

export default function LiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as { user?: { id: string } };
        if (payload.user) setCurrentUserId(payload.user.id);
      } catch {
        // guest is fine
      }
    };
    void loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSessionLoading(true);
    setSessionError(null);

    const load = async () => {
      try {
        const response = await fetch(`/api/live/sessions/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (response.status === 404) {
          if (!cancelled) setSessionError("Bu yayın bulunamadı.");
          return;
        }
        if (!response.ok) throw new Error("Yayın yüklenemedi");
        const payload = (await response.json()) as { session: LiveSession };
        if (!cancelled) setSession(payload.session);
      } catch (error) {
        if (!cancelled) {
          setSessionError(error instanceof Error ? error.message : "Bilinmeyen hata");
        }
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/live/sessions/${encodeURIComponent(id)}/chat`, {
        cache: "no-store",
      });
      if (response.status === 401 || response.status === 403) {
        setMessagesError("Sohbeti görmek için aboneliğin gerekli.");
        return;
      }
      if (!response.ok) throw new Error("Sohbet yüklenemedi");
      const payload = (await response.json()) as { messages: ChatMessage[] };
      setMessages(payload.messages);
      setMessagesError(null);
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : "Bilinmeyen hata");
    }
  }, [id]);

  useEffect(() => {
    if (!session) return;
    void loadMessages();
    const timer = setInterval(() => {
      void loadMessages();
    }, 8000);
    return () => clearInterval(timer);
  }, [session, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/live/sessions/${encodeURIComponent(id)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (response.status === 401 || response.status === 403) {
        showToast.warning("Yetki yok", "Sohbete yazmak için giriş yapman ve abone olman gerekir.");
        return;
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Mesaj gönderilemedi");
      }
      setDraft("");
      await loadMessages();
    } catch (error) {
      showToast.error(
        "Mesaj gönderilemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsSending(false);
    }
  };

  if (sessionLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </main>
    );
  }

  if (sessionError || !session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-display font-bold text-white mb-2">Yayına ulaşılamadı</h1>
          <p className="text-sm text-muted-foreground mb-6">{sessionError ?? "Bu yayın artık aktif değil."}</p>
          <Link href="/explore">
            <Button className="gradient-bg text-white border-0">Keşfetmeye Geri Dön</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="h-14 sm:h-16 border-b border-white/5 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={session.creator ? `/creator/${session.creator.id}` : "/explore"}
            className="text-muted-foreground hover:text-white transition-colors shrink-0"
            aria-label="Geri"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{session.title}</h1>
            {session.creator && (
              <p className="text-xs text-muted-foreground truncate">{session.creator.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {session.isLive ? (
            <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 font-semibold tabular-nums flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              CANLI
            </Badge>
          ) : (
            <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-muted-foreground font-medium">
              Hazırlanıyor
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video alanı */}
        <section className="flex-1 flex flex-col bg-black overflow-hidden">
          <div className="flex-1 flex items-center justify-center relative">
            {session.playbackUrl ? (
              <LivePlayer src={session.playbackUrl} />
            ) : (
              <div className="text-center px-6 py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white font-medium mb-1">
                  {session.isLive ? "Yayın başlamak üzere…" : "Yayın henüz aktif değil"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {session.isLive
                    ? "Birkaç saniye içinde video başlayacak."
                    : "Yaratıcı yayını başlattığında burada gösterilecek."}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-white/5 px-5 py-4 bg-card/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {session.creator && (
                  <Avatar className="w-10 h-10 ring-2 ring-orange-500/30 shrink-0">
                    {session.creator.avatarUrl ? (
                      <AvatarImage src={session.creator.avatarUrl} alt={session.creator.name} />
                    ) : null}
                    <AvatarFallback className="bg-orange-500/15 text-orange-400 text-xs font-semibold">
                      {initialsOf(session.creator.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{session.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.creator?.name} · {session.schedule}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {session.booked}/{session.total} izleyici
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Chat alanı */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col bg-background/50 shrink-0 max-h-[60vh] lg:max-h-none">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Canlı Sohbet
            </h2>
          </div>

          <ScrollArea className="flex-1 p-3">
            {messagesError ? (
              <div className="text-center px-4 py-10">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">{messagesError}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center px-4 py-10">
                <p className="text-sm text-muted-foreground">İlk mesajı sen yaz</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl px-3 py-2 border ${
                      message.senderId === currentUserId
                        ? "border-orange-500/20 bg-orange-500/5"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white truncate">{message.senderName}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{timeOf(message.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed break-words">
                      {message.body}
                    </p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {!messagesError && (
            <form onSubmit={sendMessage} className="border-t border-white/10 p-3 flex gap-2">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Bir şeyler yaz…"
                className="bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 h-10 rounded-xl text-sm"
              />
              <Button
                type="submit"
                disabled={isSending || !draft.trim()}
                size="sm"
                className="gradient-bg text-white border-0 font-medium h-10 px-4 shrink-0 disabled:opacity-50"
              >
                {isSending ? "…" : "Gönder"}
              </Button>
            </form>
          )}
        </aside>
      </div>
    </main>
  );
}
