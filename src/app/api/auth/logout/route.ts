import { NextResponse } from "next/server";
import { clearAuthCookies, revokeSessionFromRequest } from "@/lib/server/auth";
import { assertCsrf } from "@/lib/server/security";

export async function POST(request: Request) {
  assertCsrf(request);
  await revokeSessionFromRequest(request);

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
