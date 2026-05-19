import { NextResponse } from "next/server";
import {
  decodeLocalObjectToken,
  getObjectStorageDriver,
  readLocalObjectFile,
  writeLocalObjectFile,
} from "@/lib/server/object-storage";

function sniffMimeType(buffer: Buffer, declared?: string): string | null {
  const len = buffer.byteLength;

  // PDF: %PDF-
  if (len >= 5 && buffer.subarray(0, 5).toString("utf8") === "%PDF-") {
    return "application/pdf";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    len >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (len >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF: GIF87a or GIF89a
  if (len >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) {
    return "image/gif";
  }

  // RIFF container: WEBP, WAV, AVI
  if (len >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF") {
    const fourCC = buffer.subarray(8, 12).toString("ascii");
    if (fourCC === "WEBP") return "image/webp";
    if (fourCC === "WAVE") return "audio/wav";
  }

  // SVG: text-based, look for "<svg" or "<?xml" within first 256 bytes
  if (len >= 5) {
    const head = buffer.subarray(0, Math.min(len, 256)).toString("utf8");
    if (head.includes("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
      return "image/svg+xml";
    }
  }

  // ZIP / Office / docx / xlsx / pptx / many video containers share the ZIP signature.
  // Accept as application/zip for the legacy zip mime; otherwise honor declared zip subtypes.
  if (len >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    if (declared === "application/x-zip-compressed") return "application/x-zip-compressed";
    return "application/zip";
  }

  // OGG: OggS
  if (len >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS") {
    return "audio/ogg";
  }

  // EBML container (WebM / MKV): 1A 45 DF A3
  if (len >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    // Distinguish WebM (video) from a possible audio-only Matroska is non-trivial without parser.
    // Honor the declared content-type when it is a webm flavor.
    if (declared === "audio/webm") return "audio/webm";
    return "video/webm";
  }

  // ISO BMFF: starts at offset 4 with "ftyp" (mp4, m4a, mov)
  if (len >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "qt  ") return "video/quicktime";
    if (brand.startsWith("M4A")) return "audio/mp4";
    if (brand.startsWith("M4V") || brand.startsWith("mp4") || brand.startsWith("iso") || brand.startsWith("avc") || brand.startsWith("isom") || brand.startsWith("dash")) {
      return "video/mp4";
    }
    // Default ftyp containers to mp4 unless declared otherwise
    return declared === "audio/mp4" ? "audio/mp4" : "video/mp4";
  }

  // MP3: ID3 header
  if (len >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return "audio/mpeg";
  }
  // MP3: MPEG audio sync (FF Fx)
  if (len >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return "audio/mpeg";
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

  const declaredType = payload.contentType.trim().toLowerCase();
  const detectedMimeType = sniffMimeType(content, declaredType);
  if (!detectedMimeType || detectedMimeType !== declaredType) {
    return NextResponse.json(
      { error: "Unsupported or mismatched file type", declared: declaredType, detected: detectedMimeType },
      { status: 400 },
    );
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
