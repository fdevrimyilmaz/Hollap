import { NextResponse } from "next/server";
import { authErrorResponse, requireAuthSession } from "@/lib/server/auth";

export async function GET(request: Request) {
  try {
    const session = await requireAuthSession(request);
    return NextResponse.json({ user: session.user, sessionId: session.sessionId });
  } catch (error) {
    return authErrorResponse(error);
  }
}
