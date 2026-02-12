import { NextResponse } from "next/server";
import {
  decodeLocalObjectToken,
  getObjectStorageDriver,
  readLocalObjectFile,
  writeLocalObjectFile,
} from "@/lib/server/object-storage";

function sniffMimeType(buffer: Buffer): string | null {
  if (buffer.byteLength >= 5 && buffer.subarray(0, 5).toString("utf8") === "%PDF-") {
    return "application/pdf";
  }

  if (
    buffer.byteLength >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (buffer.byteLength >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.byteLength >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return "application/zip";
  }

  return null;
}

function badTokenResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid or expired object token" }, { status: 403 });
}

export async function PUT(request: Request) {
  if (getObjectStorageDriver() !== "local") {
    return NextResponse.json({ error: "Unsupported storage driver" }, { status: 404 });
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token query parameter is required" }, { status: 400 });
  }

  const payload = decodeLocalObjectToken(token);
  if (!payload || payload.op !== "upload") {
    return badTokenResponse();
  }

  const contentType = request.headers.get("content-type")?.trim().toLowerCase();
  if (!contentType || contentType !== payload.contentType.trim().toLowerCase()) {
    return NextResponse.json({ error: "Content-Type mismatch" }, { status: 400 });
  }

  const content = Buffer.from(await request.arrayBuffer());
  if (content.byteLength !== payload.sizeBytes) {
    return NextResponse.json({ error: "File size mismatch" }, { status: 400 });
  }

  const detectedMimeType = sniffMimeType(content);
  if (!detectedMimeType || detectedMimeType !== payload.contentType.trim().toLowerCase()) {
    return NextResponse.json({ error: "Unsupported or mismatched file type" }, { status: 400 });
  }

  try {
    await writeLocalObjectFile(payload.key, content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return NextResponse.json({ error: "Object already exists" }, { status: 409 });
    }

    throw error;
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  if (getObjectStorageDriver() !== "local") {
    return NextResponse.json({ error: "Unsupported storage driver" }, { status: 404 });
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token query parameter is required" }, { status: 400 });
  }

  const payload = decodeLocalObjectToken(token);
  if (!payload || payload.op !== "download") {
    return badTokenResponse();
  }

  try {
    const data = await readLocalObjectFile(payload.key);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": payload.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(payload.fileName)}"`,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    throw error;
  }
}
