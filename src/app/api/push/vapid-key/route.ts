import { NextResponse } from "next/server";

export async function GET() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return NextResponse.json({ publicKey: null, enabled: false });
  }
  return NextResponse.json({ publicKey, enabled: true });
}
