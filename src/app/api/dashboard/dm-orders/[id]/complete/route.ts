import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { markDmOrderCompleted } from "@/lib/server/dm";
import { assertCsrf } from "@/lib/server/security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id } = await context.params;

    await markDmOrderCompleted(id, user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
