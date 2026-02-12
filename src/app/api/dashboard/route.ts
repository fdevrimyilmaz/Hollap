import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { getCreatorDashboard } from "@/lib/server/dashboard";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request, { role: "creator" });
    const dashboard = await getCreatorDashboard(user.id);

    return NextResponse.json({
      user,
      ...dashboard,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

