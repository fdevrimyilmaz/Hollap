"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type NotificationType =
  | "sale"
  | "subscriber"
  | "comment"
  | "like"
  | "system"
  | "course"
  | "live"
  | "file"
  | "dm";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  avatar?: string;
  link?: string;
}

type NotificationInput = Omit<AppNotification, "id" | "time" | "read"> & {
  time?: string;
  read?: boolean;
};

interface NotificationCenterValue {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  addNotification: (notification: NotificationInput) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationCenterContext = createContext<NotificationCenterValue | null>(
  null
);

const getNotificationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

function normalizeNotification(payload: {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string | null;
}): AppNotification {
  return {
    id: payload.id,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    time: payload.time,
    read: payload.read,
    link: payload.link ?? undefined,
  };
}

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        setIsAuthenticated(false);
        setNotifications([]);
        return;
      }

      if (!response.ok) {
        return;
      }

      setIsAuthenticated(true);

      const data = (await response.json()) as {
        notifications: Array<{
          id: string;
          type: NotificationType;
          title: string;
          message: string;
          time: string;
          read: boolean;
          link?: string;
        }>;
      };

      setNotifications(data.notifications.map(normalizeNotification));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  const addNotification = useCallback((notification: NotificationInput) => {
    setNotifications((prev) => [
      {
        id: getNotificationId(),
        time: notification.time ?? new Date().toISOString(),
        read: notification.read ?? false,
        ...notification,
      },
      ...prev,
    ]);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );

    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );

    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ all: true }),
    });
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      isAuthenticated,
      addNotification,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      isAuthenticated,
      addNotification,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
    ]
  );

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error(
      "useNotificationCenter must be used within NotificationCenterProvider"
    );
  }
  return context;
}

