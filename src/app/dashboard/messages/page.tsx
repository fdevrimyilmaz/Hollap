"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showToast } from "@/components/ToastProvider";

type Conversation = {
  id: string;
  creatorId: string;
  subscriberId: string;
  withUserName: string;
  updatedAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "creator" | "subscriber";
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export default function MessagesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      }
    };

    void loadUser();
  }, [router]);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/dm/conversations", { cache: "no-store" });
      if (!response.ok) throw new Error("Konuşmalar yüklenemedi");
      const payload = (await response.json()) as { conversations: Conversation[] };
      setConversations(payload.conversations);
      if (payload.conversations.length > 0 && !selectedId) {
        setSelectedId(payload.conversations[0].id);
      }
    } catch (error) {
      showToast.error(
        "Konuşmalar yüklenemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    if (user) void loadConversations();
  }, [user, loadConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsMessagesLoading(true);
    try {
      const response = await fetch(`/api/dm/conversations/${conversationId}/messages`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Mesajlar yüklenemedi");
      const payload = (await response.json()) as { messages: Message[] };
      setMessages(payload.messages);
    } catch (error) {
      showToast.error(
        "Mesajlar yüklenemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
      setMessages([]);
    } finally {
      setIsMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    const body = draft.trim();
    if (!body) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/dm/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Mesaj gönderilemedi");
      }
      const payload = (await response.json()) as { message: Message };
      setMessages((prev) => [...prev, payload.message]);
      setDraft("");
    } catch (error) {
      showToast.error(
        "Mesaj gönderilemedi",
        error instanceof Error ? error.message : "Bilinmeyen hata",
      );
    } finally {
      setIsSending(false);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-white/5 px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">Mesajlar</h1>
            <p className="text-sm text-muted-foreground mt-1">DM siparişleri ve abonelerle iletişim</p>
          </div>
          <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
            <Link href="/dashboard">← Panele Dön</Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation list */}
        <aside className="w-full sm:w-80 border-r border-white/10 flex flex-col shrink-0">
          <div className="p-3 border-b border-white/10">
            <Input
              placeholder="Konuşma ara…"
              className="bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 h-10 rounded-xl"
              disabled
            />
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl shimmer" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">Henüz konuşma yok</p>
                <p className="text-xs text-muted-foreground/70 mt-1">İlk DM siparişiyle bu liste dolacak</p>
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === selectedId;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors mb-1 ${
                        isActive
                          ? "bg-orange-500/15 border border-orange-500/30"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarFallback className="bg-white/10 text-xs font-semibold">
                          {initialsOf(conversation.withUserName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? "text-orange-400" : "text-white"}`}>
                          {conversation.withUserName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {relativeTime(conversation.updatedAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Message thread */}
        <section className="flex-1 flex flex-col bg-background/50 overflow-hidden hidden sm:flex">
          {selectedConversation ? (
            <>
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-white/10 text-xs font-semibold">
                    {initialsOf(selectedConversation.withUserName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{selectedConversation.withUserName}</p>
                  <p className="text-xs text-muted-foreground">DM konuşması</p>
                </div>
              </div>

              <ScrollArea className="flex-1 p-5">
                {isMessagesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 rounded-xl shimmer max-w-md" />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-12 h-12 mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                      <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">İlk mesajı sen yaz</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isOwn = message.senderId === user.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? "gradient-bg text-white"
                              : "bg-white/[0.06] border border-white/10 text-white"
                          }`}>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
                            <p className={`text-[10px] mt-1 tabular-nums ${
                              isOwn ? "text-white/70" : "text-muted-foreground"
                            }`}>
                              {relativeTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Mesajını yaz…"
                  className="bg-white/5 border-white/10 hover:border-white/20 focus:border-orange-500/60 focus-visible:ring-orange-500/30 rounded-xl min-h-[44px] max-h-32 resize-y"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend(event);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={isSending || !draft.trim()}
                  className="gradient-bg text-white border-0 shadow-md shadow-orange-500/25 font-medium h-11 px-5 shrink-0 disabled:opacity-50"
                >
                  {isSending ? "…" : "Gönder"}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <p className="text-muted-foreground">Görüntülemek için bir konuşma seç</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
