import { Buffer } from "node:buffer";
import { db, nowIso } from "@/lib/server/db";
import { enqueueNotification } from "@/lib/server/notifications";
import { writeAuditLog } from "@/lib/server/audit";

type LiveSessionRow = {
  id: string;
  creator_id: string;
  title: string;
  schedule: string;
  booked: number;
  total: number;
  status: "scheduled" | "live" | "ended";
  stream_key: string | null;
  playback_url: string | null;
};

const LIVE_BLOCKED_WORDS = (process.env.LIVE_CHAT_BLOCKED_WORDS ?? "spam,scam")
  .split(",")
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);

function randomToken(size = 24): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < size; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function provisionLiveIngest(): Promise<{
  streamKey: string;
  playbackUrl: string | null;
  provider: "mux" | "local";
}> {
  const muxTokenId = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

  if (muxTokenId && muxTokenSecret) {
    const auth = Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString("base64");
    const response = await fetch("https://api.mux.com/video/v1/live-streams", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playback_policy: ["public"],
        reconnect_window: 60,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Mux live stream creation failed: ${response.status} ${body}`);
    }

    const payload = (await response.json()) as {
      data: {
        stream_key: string;
        playback_ids?: Array<{ id: string }>;
      };
    };

    const playbackId = payload.data.playback_ids?.[0]?.id ?? null;

    return {
      streamKey: payload.data.stream_key,
      playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
      provider: "mux",
    };
  }

  return {
    streamKey: `local_${randomToken(32)}`,
    playbackUrl: null,
    provider: "local",
  };
}

export async function listCreatorLiveSessions(creatorId: string): Promise<Array<{
  id: string;
  title: string;
  schedule: string;
  booked: number;
  total: number;
  isLive: boolean;
  streamKeyAvailable: boolean;
  playbackUrl: string | null;
}>> {
  const rows = await db
    .prepare(
      `
        SELECT id, creator_id, title, schedule, booked, total, status, stream_key, playback_url
        FROM live_sessions
        WHERE creator_id = ?
        ORDER BY created_at DESC
      `
    )
    .all(creatorId);

  return rows.map((row) => {
    const session = row as LiveSessionRow;
    return {
      id: session.id,
      title: session.title,
      schedule: session.schedule,
      booked: session.booked,
      total: session.total,
      isLive: session.status === "live",
      streamKeyAvailable: Boolean(session.stream_key),
      playbackUrl: session.playback_url,
    };
  });
}

export async function toggleLiveSession(params: {
  creatorId: string;
  sessionId: string;
}): Promise<{
  id: string;
  isLive: boolean;
  streamKeyAvailable: boolean;
  playbackUrl: string | null;
}> {
  const session = await db
    .prepare(
      `
        SELECT id, creator_id, title, schedule, booked, total, status, stream_key, playback_url
        FROM live_sessions
        WHERE id = ?
      `
    )
    .get(params.sessionId) as LiveSessionRow | undefined;

  if (!session) {
    throw new Error("Live session not found");
  }

  if (session.creator_id !== params.creatorId) {
    throw new Error("Live session access denied");
  }

  if (session.status === "live") {
    await db.prepare(
      "UPDATE live_sessions SET status = 'ended', updated_at = ? WHERE id = ?"
    ).run(nowIso(), session.id);

    await writeAuditLog({
      actorUserId: params.creatorId,
      action: "live.session_ended",
      entityType: "live_session",
      entityId: session.id,
    });

    return {
      id: session.id,
      isLive: false,
      streamKeyAvailable: Boolean(session.stream_key),
      playbackUrl: session.playback_url,
    };
  }

  const ingest = await provisionLiveIngest();

  await db.prepare(
    `
      UPDATE live_sessions
      SET status = 'live',
          stream_key = ?,
          playback_url = ?,
          updated_at = ?
      WHERE id = ?
    `
  ).run(ingest.streamKey, ingest.playbackUrl, nowIso(), session.id);

  const subscribers = await db
    .prepare(
      "SELECT subscriber_id FROM subscriptions WHERE creator_id = ? AND stripe_status IN ('active', 'trialing')"
    )
    .all(params.creatorId) as Array<{ subscriber_id: string }>;

  for (const subscriber of subscribers) {
    await enqueueNotification({
      userId: subscriber.subscriber_id,
      type: "live",
      title: "Canli yayin basladi",
      message: `${session.title} simdi yayinda.`,
      link: "/dashboard",
      channels: ["in_app", "push", "email"],
    });
  }

  await writeAuditLog({
    actorUserId: params.creatorId,
    action: "live.session_started",
    entityType: "live_session",
    entityId: session.id,
    metadata: {
      provider: ingest.provider,
      playbackUrl: ingest.playbackUrl,
    },
  });

  return {
    id: session.id,
    isLive: true,
    streamKeyAvailable: true,
    playbackUrl: ingest.playbackUrl,
  };
}

async function assertLiveAccess(sessionId: string, userId: string): Promise<LiveSessionRow> {
  const session = await db
    .prepare(
      `
        SELECT id, creator_id, title, schedule, booked, total, status, stream_key, playback_url
        FROM live_sessions
        WHERE id = ?
      `
    )
    .get(sessionId) as LiveSessionRow | undefined;

  if (!session) {
    throw new Error("Live session not found");
  }

  if (session.creator_id === userId) {
    return session;
  }

  const subscription = await db
    .prepare(
      "SELECT id FROM subscriptions WHERE creator_id = ? AND subscriber_id = ? AND stripe_status IN ('active', 'trialing')"
    )
    .get(session.creator_id, userId) as { id: string } | undefined;

  if (!subscription) {
    throw new Error("Live session access denied");
  }

  return session;
}

export async function listLiveChatMessages(params: { sessionId: string; userId: string }): Promise<Array<{
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  flagged: boolean;
  createdAt: string;
}>> {
  await assertLiveAccess(params.sessionId, params.userId);

  const rows = await db
    .prepare(
      `
        SELECT m.id, m.sender_id, u.name as sender_name, m.body, m.flagged, m.created_at
        FROM live_chat_messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.live_session_id = ?
        ORDER BY m.created_at ASC
        LIMIT 200
      `
    )
    .all(params.sessionId);

  return rows.map((row) => {
    const item = row as {
      id: string;
      sender_id: string;
      sender_name: string;
      body: string;
      flagged: number;
      created_at: string;
    };

    return {
      id: item.id,
      senderId: item.sender_id,
      senderName: item.sender_name,
      body: item.body,
      flagged: Boolean(item.flagged),
      createdAt: item.created_at,
    };
  });
}

export async function addLiveChatMessage(params: {
  sessionId: string;
  senderId: string;
  body: string;
}): Promise<{ id: string; flagged: boolean }> {
  const session = await assertLiveAccess(params.sessionId, params.senderId);
  const lower = params.body.toLowerCase();
  const flagged = LIVE_BLOCKED_WORDS.some((word) => lower.includes(word));
  const messageId = `lchat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  await db.prepare(
    `
      INSERT INTO live_chat_messages (id, live_session_id, sender_id, body, flagged, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    messageId,
    params.sessionId,
    params.senderId,
    params.body,
    flagged ? 1 : 0,
    nowIso()
  );

  if (flagged) {
    await writeAuditLog({
      actorUserId: params.senderId,
      action: "live.chat_flagged",
      entityType: "live_chat_message",
      entityId: messageId,
      metadata: {
        sessionId: params.sessionId,
      },
    });
  } else if (params.senderId !== session.creator_id) {
    await enqueueNotification({
      userId: session.creator_id,
      type: "live",
      title: "Canli chat mesaji",
      message: params.body.slice(0, 140),
      link: "/dashboard",
      channels: ["in_app", "push"],
    });
  }

  return {
    id: messageId,
    flagged,
  };
}
