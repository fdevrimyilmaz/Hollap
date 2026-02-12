import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { getOrCreateConversation, listConversationsForUser } from "@/lib/server/dm";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const createConversationSchema = z.object({
  peerUserId: z.string().trim().min(1),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const conversations = await listConversationsForUser(user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const body = await parseJsonBody(request, createConversationSchema);

    const conversation =
      user.role === "creator"
        ? await getOrCreateConversation({ creatorId: user.id, subscriberId: body.peerUserId })
        : await getOrCreateConversation({ creatorId: body.peerUserId, subscriberId: user.id });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
