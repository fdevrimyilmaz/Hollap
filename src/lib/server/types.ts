export type UserRole = "admin" | "creator" | "subscriber";

export type DmOrderStatus =
  | "pending"
  | "payment_link_sent"
  | "paid"
  | "completed"
  | "failed"
  | "refunded";

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

export type NotificationChannel = "in_app" | "email" | "push";

export type LiveSessionStatus = "scheduled" | "live" | "ended";

export type FileAudience = "tum-aboneler" | "vip" | "yeni";
