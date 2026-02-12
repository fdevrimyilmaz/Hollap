import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { addLiveChatMessage, listLiveChatMessages } from "@/lib/server/live";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

type Params = {
  params: Promise<{ id: string }>;
};

const liveMessageSchema = z.object({
  body: z.string().trim().min(1).max(1200),
});

export async function GET(request: Request, context: Params) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    const messages = await listLiveChatMessages({
      sessionId: id,
      userId: user.id,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await parseJsonBody(request, liveMessageSchema);

    const message = await addLiveChatMessage({
      sessionId: id,
      senderId: user.id,
      body: body.body,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
