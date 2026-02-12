"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificationCenter } from "@/components/NotificationCenter";

const labelByType: Record<string, string> = {
  sale: "Satis",
  subscriber: "Abone",
  comment: "Yorum",
  like: "Begeni",
  system: "Sistem",
  course: "Kurs",
  live: "Canli",
  file: "Dosya",
  dm: "DM",
};

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "simdi";
  if (minutes < 60) return `${minutes} dk once`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat once`;
  const days = Math.floor(hours / 24);
  return `${days} gun once`;
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
    <main className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Tum Bildirimler</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Bildirimler yukleniyor..."
                : `${notifications.length} bildirim, ${unreadCount} okunmamis`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/10">
                Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-white/10"
              onClick={() => void markAllAsRead()}
              disabled={!notifications.length}
            >
              Tumunu Okundu Isaretle
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {!isLoading && notifications.length === 0 && (
            <article className="glass-card rounded-2xl p-6">
              <p className="text-muted-foreground">Henuz bildirim bulunmuyor.</p>
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
                    : "border-orange-500/40 bg-orange-500/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="border-white/10 text-xs">
                        {labelByType[notification.type] || "Bildirim"}
                      </Badge>
                      {!notification.read && (
                        <Badge className="gradient-bg border-0 text-xs">Yeni</Badge>
                      )}
                    </div>
                    <p className="text-white font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
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
