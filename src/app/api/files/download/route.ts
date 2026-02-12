import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Legacy download endpoint is deprecated. Request a signed URL from /api/files/signed-url.",
    },
    { status: 410 }
  );
}
