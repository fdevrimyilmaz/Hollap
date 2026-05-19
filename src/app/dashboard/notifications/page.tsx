"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificationCenter } from "@/components/NotificationCenter";

const labelByType: Record<string, string> = {
  sale: "Satış",
  subscriber: "Abone",
  comment: "Yorum",
  like: "Beğeni",
  system: "Sistem",
  course: "Kurs",
  live: "Canlı",
  file: "Dosya",
  dm: "DM",
};

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export default function DashboardNotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationCenter();

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  return (
    <main className="min-h-screen p-6 lg:p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Bildirimler</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading
                ? "Bildirimler yükleniyor…"
                : (
                  <>
                    <span className="text-white font-medium tabular-nums">{notifications.length}</span> bildirim,{" "}
                    <span className="text-white font-medium tabular-nums">{unreadCount}</span> okunmamış
                  </>
                )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25">
                ← Panele Dön
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/25"
              onClick={() => void markAllAsRead()}
              disabled={!notifications.length}
            >
              Tümünü Okundu İşaretle
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {!isLoading && notifications.length === 0 && (
            <article className="glass-card rounded-2xl p-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-muted-foreground">Henüz bildirim yok.</p>
            </article>
          )}

          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notification.link || "/dashboard"}
              onClick={() => void markAsRead(notification.id)}
              className="block"
            >
              <article
                className={`glass-card rounded-2xl p-5 border transition-colors ${
                  notification.read
                    ? "border-white/10 hover:border-white/20"
                    : "border-orange-500/40 bg-orange-500/[0.06]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-muted-foreground text-xs font-medium">
                        {labelByType[notification.type] || "Bildirim"}
                      </Badge>
                      {!notification.read && (
                        <Badge className="gradient-bg border-0 text-xs font-semibold">Yeni</Badge>
                      )}
                    </div>
                    <p className="text-white font-semibold">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{notification.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {formatNotificationTime(notification.time)}
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
