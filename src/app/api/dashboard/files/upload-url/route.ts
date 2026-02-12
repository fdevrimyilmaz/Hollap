import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { preparePrivateFileUploads } from "@/lib/server/files";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const prepareUploadSchema = z.object({
  audience: z.enum(["tum-aboneler", "vip", "yeni"]),
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        size: z.number().int().positive(),
        type: z.string().trim().min(1).max(128),
      })
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const body = await parseJsonBody(request, prepareUploadSchema);

    const uploads = await preparePrivateFileUploads({
      creatorId: user.id,
      audience: body.audience,
      files: body.files,
      origin: new URL(request.url).origin,
    });

    return NextResponse.json({
      uploads,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
