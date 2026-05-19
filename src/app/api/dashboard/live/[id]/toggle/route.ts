import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { LiveProviderUnavailableError, toggleLiveSession } from "@/lib/server/live";
import { assertCsrf } from "@/lib/server/security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id } = await context.params;

    const session = await toggleLiveSession({
      creatorId: user.id,
      sessionId: id,
    });

    return NextResponse.json({
      ok: true,
      session,
    });
  } catch (error) {
    if (error instanceof LiveProviderUnavailableError) {
      return NextResponse.json(
        {
          error: error.message,
          configured: false,
        },
        { status: 503 },
      );
    }
    return authErrorResponse(error);
  }
}
