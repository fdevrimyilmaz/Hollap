import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { addConversationMessage, listConversationMessages } from "@/lib/server/dm";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

type Params = {
  params: Promise<{ id: string }>;
};

const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function GET(request: Request, context: Params) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const messages = await listConversationMessages(id, user.id);
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
    const body = await parseJsonBody(request, messageSchema);

    const message = await addConversationMessage({
      conversationId: id,
      senderId: user.id,
      body: body.body,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
