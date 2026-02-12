import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/server/notifications";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const markNotificationSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ id: z.string().trim().min(1), all: z.literal(false).optional() }),
]);

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const notifications = (await listNotifications(user.id)).map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      link: item.link,
      time: item.created_at,
      read: Boolean(item.read),
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const body = await parseJsonBody(request, markNotificationSchema);

    if ("all" in body && body.all) {
      await markAllNotificationsAsRead(user.id);
      return NextResponse.json({ ok: true });
    }

    await markNotificationAsRead(user.id, body.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
