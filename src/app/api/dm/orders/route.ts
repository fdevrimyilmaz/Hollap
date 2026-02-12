import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import {
  createDmOrder,
  getOrCreateConversation,
  listDmOrdersForCreator,
} from "@/lib/server/dm";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const createDmOrderSchema = z.object({
  subscriberId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
  conversationId: z.string().trim().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request, { role: "creator" });
    const orders = await listDmOrdersForCreator(user.id);
    return NextResponse.json({ orders });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const body = await parseJsonBody(request, createDmOrderSchema);

    const conversation = body.conversationId
      ? { id: body.conversationId }
      : await getOrCreateConversation({
          creatorId: user.id,
          subscriberId: body.subscriberId,
        });

    const order = await createDmOrder({
      creatorId: user.id,
      subscriberId: body.subscriberId,
      conversationId: conversation.id,
      productId: body.productId,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
