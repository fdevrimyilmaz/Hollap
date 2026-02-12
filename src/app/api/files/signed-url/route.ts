import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { createPrivateDownloadUrl } from "@/lib/server/files";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const signedUrlSchema = z.object({
  assetId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const body = await parseJsonBody(request, signedUrlSchema);

    const signedDownload = await createPrivateDownloadUrl({
      assetId: body.assetId,
      user,
      origin: new URL(request.url).origin,
    });

    return NextResponse.json({
      downloadUrl: signedDownload.downloadUrl,
      expiresInSeconds: signedDownload.expiresInSeconds,
      singleUse: false,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
