import nodemailer from "nodemailer";
import webpush from "web-push";
import { db, createId, nowIso } from "@/lib/server/db";
import type { NotificationChannel, NotificationType } from "@/lib/server/types";
import { writeAuditLog } from "@/lib/server/audit";

type UserRow = {
  id: string;
  email: string;
  name: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: number;
  created_at: string;
};

type DeliveryRow = {
  id: string;
  notification_id: string;
  user_id: string;
  channel: "email" | "push";
  destination: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
};

const MAX_DELIVERY_ATTEMPTS = 5;

let smtpTransporter: nodemailer.Transporter | null = null;

function getSmtpTransporter(): nodemailer.Transporter {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing");
  }

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  return smtpTransporter;
}

function ensureWebPushConfig(): void {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Web push configuration is missing");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function getNextAttemptIso(attempts: number): string {
  const retryMinutes = Math.min(60, 2 ** Math.max(1, attempts));
  return new Date(Date.now() + retryMinutes * 60 * 1000).toISOString();
}

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  return await db
    .prepare(
      `
        SELECT id, user_id, type, title, message, link, read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `
    )
    .all(userId) as NotificationRow[];
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  await db.prepare(
    "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?"
  ).run(notificationId, userId);
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId);
}

export async function enqueueNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  channels?: NotificationChannel[];
}): Promise<string> {
  const channels = params.channels ?? ["in_app"];
  const createdAt = nowIso();
  const notificationId = createId("noti");

  await db.prepare(
    `
      INSERT INTO notifications (id, user_id, type, title, message, link, read, created_at)
      VALUES (@id, @user_id, @type, @title, @message, @link, 0, @created_at)
    `
  ).run({
    id: notificationId,
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link ?? null,
    created_at: createdAt,
  });

  const user = await db
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(params.userId) as UserRow | undefined;

  if (!user) {
    return notificationId;
  }

  if (channels.includes("email")) {
    await db.prepare(
      `
        INSERT INTO notification_deliveries (
          id,
          notification_id,
          user_id,
          channel,
          destination,
          status,
          attempts,
          next_attempt_at,
          created_at,
          updated_at
        )
        VALUES (@id, @notification_id, @user_id, 'email', @destination, 'pending', 0, @next_attempt_at, @created_at, @updated_at)
      `
    ).run({
      id: createId("delv"),
      notification_id: notificationId,
      user_id: user.id,
      destination: user.email,
      next_attempt_at: createdAt,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }

  if (channels.includes("push")) {
    const pushSubs = await db
      .prepare(
        "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?"
      )
      .all(user.id) as Array<{ endpoint: string; p256dh: string; auth: string }>;

    for (const sub of pushSubs) {
      await db.prepare(
        `
          INSERT INTO notification_deliveries (
            id,
            notification_id,
            user_id,
            channel,
            destination,
            status,
            attempts,
            next_attempt_at,
            created_at,
            updated_at
          )
          VALUES (@id, @notification_id, @user_id, 'push', @destination, 'pending', 0, @next_attempt_at, @created_at, @updated_at)
        `
      ).run({
        id: createId("delv"),
        notification_id: notificationId,
        user_id: user.id,
        destination: JSON.stringify(sub),
        next_attempt_at: createdAt,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }
  }

  return notificationId;
}

async function sendEmailDelivery(delivery: DeliveryRow, notification: NotificationRow): Promise<string> {
  const transporter = getSmtpTransporter();

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "no-reply@creatorhub.local",
    to: delivery.destination,
    subject: notification.title,
    text: `${notification.message}${notification.link ? `\n\n${notification.link}` : ""}`,
  });

  return info.messageId;
}

async function sendPushDelivery(delivery: DeliveryRow, notification: NotificationRow): Promise<string> {
  ensureWebPushConfig();

  const subscription = JSON.parse(delivery.destination) as {
    endpoint: string;
    p256dh: string;
    auth: string;
  };

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify({
      title: notification.title,
      message: notification.message,
      link: notification.link,
    })
  );

  return subscription.endpoint;
}

export async function processDeliveryQueue(limit = 20): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const deliveries = await db
    .prepare(
      `
        SELECT id, notification_id, user_id, channel, destination, status, attempts, next_attempt_at, last_error
        FROM notification_deliveries
        WHERE status = 'pending' AND next_attempt_at <= ?
        ORDER BY next_attempt_at ASC
        LIMIT ?
      `
    )
    .all(nowIso(), limit) as DeliveryRow[];

  let sent = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    const notification = await db
      .prepare(
        "SELECT id, user_id, type, title, message, link, read, created_at FROM notifications WHERE id = ?"
      )
      .get(delivery.notification_id) as NotificationRow | undefined;

    if (!notification) {
      await db.prepare(
        "UPDATE notification_deliveries SET status = 'failed', last_error = ?, updated_at = ? WHERE id = ?"
      ).run("Notification not found", nowIso(), delivery.id);
      failed += 1;
      continue;
    }

    try {
      const providerMessageId =
        delivery.channel === "email"
          ? await sendEmailDelivery(delivery, notification)
          : await sendPushDelivery(delivery, notification);

      await db.prepare(
        `
          UPDATE notification_deliveries
          SET status = 'sent',
              attempts = attempts + 1,
              provider_message_id = ?,
              updated_at = ?,
              last_error = NULL
          WHERE id = ?
        `
      ).run(providerMessageId, nowIso(), delivery.id);

      sent += 1;
    } catch (error) {
      const nextAttempts = delivery.attempts + 1;
      const message = error instanceof Error ? error.message : "Delivery failed";
      const isTerminal = nextAttempts >= MAX_DELIVERY_ATTEMPTS;

      await db.prepare(
        `
          UPDATE notification_deliveries
          SET status = @status,
              attempts = @attempts,
              next_attempt_at = @next_attempt_at,
              last_error = @last_error,
              updated_at = @updated_at
          WHERE id = @id
        `
      ).run({
        id: delivery.id,
        status: isTerminal ? "failed" : "pending",
        attempts: nextAttempts,
        next_attempt_at: isTerminal ? delivery.next_attempt_at : getNextAttemptIso(nextAttempts),
        last_error: message,
        updated_at: nowIso(),
      });

      failed += 1;

      await writeAuditLog({
        actorUserId: delivery.user_id,
        action: "notification.delivery_failed",
        entityType: "notification_delivery",
        entityId: delivery.id,
        metadata: {
          channel: delivery.channel,
          attempts: nextAttempts,
          error: message,
        },
      });
    }
  }

  return {
    processed: deliveries.length,
    sent,
    failed,
  };
}

export async function savePushSubscription(params: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  await db.prepare(
    `
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
      VALUES (@id, @user_id, @endpoint, @p256dh, @auth, @created_at)
      ON CONFLICT(user_id, endpoint)
      DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth
    `
  ).run({
    id: createId("push"),
    user_id: params.userId,
    endpoint: params.endpoint,
    p256dh: params.p256dh,
    auth: params.auth,
    created_at: nowIso(),
  });
}
