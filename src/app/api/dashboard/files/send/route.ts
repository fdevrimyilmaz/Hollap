import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { completePrivateFileUploads } from "@/lib/server/files";
import { enqueueNotification } from "@/lib/server/notifications";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const completeUploadSchema = z.object({
  audience: z.enum(["tum-aboneler", "vip", "yeni"]),
  assetIds: z.array(z.string().trim().min(1)).min(1),
});

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const body = await parseJsonBody(request, completeUploadSchema);

    const completion = await completePrivateFileUploads({
      creatorId: user.id,
      audience: body.audience,
      assetIds: body.assetIds,
    });

    await enqueueNotification({
      userId: user.id,
      type: "file",
      title: "Dosya gonderimi tamamlandi",
      message: `${completion.filesUploaded} dosya yayinlandi, ${completion.grantsCreated} yetki olusturuldu.`,
      link: "/dashboard",
      channels: ["in_app", "email"],
    });

    return NextResponse.json({
      ok: true,
      filesUploaded: completion.filesUploaded,
      grantsCreated: completion.grantsCreated,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
