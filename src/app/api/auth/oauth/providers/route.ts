import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isConfigured(idKey: string, secretKey: string): boolean {
  const id = process.env[idKey]?.trim();
  const secret = process.env[secretKey]?.trim();
  return Boolean(id && secret);
}

export async function GET() {
  return NextResponse.json(
    {
      google: isConfigured("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"),
      github: isConfigured("GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET"),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}
