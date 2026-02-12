"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotificationCenter,
  type AppNotification,
} from "@/components/NotificationCenter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type Notification = AppNotification;

const notificationIcons: Record<string, React.ReactNode> = {
  sale: (
    <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  subscriber: (
    <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  comment: (
    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  like: (
    <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  system: (
    <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  course: (
    <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  live: (
    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 9.5a3.5 3.5 0 013.5-3.5h3a3.5 3.5 0 013.5 3.5v5a3.5 3.5 0 01-3.5 3.5h-3A3.5 3.5 0 014 14.5v-5z" />
    </svg>
  ),
  file: (
    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9 13h6M9 17h6" />
    </svg>
  ),
  dm: (
    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8M8 14h6m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    refreshNotifications,
    isLoading,
  } =
    useNotificationCenter();

  const formatNotificationTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const minutes = Math.floor((Date.now() - date.getTime()) / (60 * 1000));
    if (minutes < 1) return "simdi";
    if (minutes < 60) return `${minutes} dk once`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat once`;
    const days = Math.floor(hours / 24);
    return `${days} gun once`;
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          void refreshNotifications();
        }
      }}
    >
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full gradient-bg text-white text-xs flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-96 p-0 bg-card border-white/10"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">Bildirimler</h3>
            {unreadCount > 0 && (
              <Badge className="gradient-bg border-0 text-xs">{unreadCount} yeni</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => {
                void markAllAsRead();
              }}
              className="text-sm text-orange-500 hover:text-orange-400 transition-colors"
            >
              Tumunu Okundu Isaretle
            </button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Bildirimler yukleniyor...</div>
          ) : notifications.length > 0 ? (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.link || "/dashboard/notifications"}
                  onClick={() => {
                    void markAsRead(notification.id);
                    setIsOpen(false);
                  }}
                  className={`flex gap-3 p-4 hover:bg-white/5 transition-colors ${
                    !notification.read ? "bg-orange-500/5" : ""
                  }`}
                >
                  {notification.avatar ? (
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={notification.avatar} />
                      <AvatarFallback>{notification.title[0]}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      {notificationIcons[notification.type]}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!notification.read ? "text-white" : "text-muted-foreground"}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatNotificationTime(notification.time)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <svg className="w-12 h-12 text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-muted-foreground">Henuz bildirim yok</p>
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-white/10">
          <Link href="/dashboard/notifications" onClick={() => setIsOpen(false)}>
            <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
              Tum Bildirimleri Gor
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

