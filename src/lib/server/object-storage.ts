import { createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HttpError } from "@/lib/server/auth";
import { STORAGE_DIR } from "@/lib/server/db";

type ObjectStorageDriver = "local" | "s3";

type SignedUploadRequest = {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresInSeconds: number;
};

type SignedDownloadRequest = {
  url: string;
  method: "GET";
  headers: Record<string, string>;
  expiresInSeconds: number;
};

type ObjectHead = {
  exists: boolean;
  sizeBytes: number | null;
  contentType: string | null;
};

type LocalUploadTokenPayload = {
  op: "upload";
  key: string;
  contentType: string;
  sizeBytes: number;
  expiresAt: string;
};

type LocalDownloadTokenPayload = {
  op: "download";
  key: string;
  fileName: string;
  contentType: string;
  expiresAt: string;
};

export type LocalObjectTokenPayload = LocalUploadTokenPayload | LocalDownloadTokenPayload;

type S3Config = {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
};

function resolveObjectStorageDriver(): ObjectStorageDriver {
  const raw = (process.env.OBJECT_STORAGE_DRIVER ?? "local").trim().toLowerCase();
  if (raw === "local") {
    return "local";
  }

  if (raw === "s3") {
    return "s3";
  }

  throw new Error("OBJECT_STORAGE_DRIVER must be one of: local, s3");
}

function getFileTokenSecret(): string {
  const secret =
    process.env.FILE_TOKEN_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-file-token-secret");

  if (!secret) {
    throw new Error("FILE_TOKEN_SECRET is required in production");
  }

  return secret;
}

function getSignedUrlTtlSeconds(): number {
  const raw = Number(process.env.OBJECT_STORAGE_PRESIGN_TTL_SECONDS ?? 300);
  if (!Number.isFinite(raw) || raw < 30) {
    return 300;
  }

  return Math.min(3600, Math.floor(raw));
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function signLocalTokenPayload(encodedPayload: string): string {
  return createHmac("sha256", getFileTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function encodeLocalObjectToken(payload: LocalObjectTokenPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signLocalTokenPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function isSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.byteLength !== rightBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function buildOrigin(origin: string): string {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

function sanitizeStorageKey(storageKey: string): string {
  const normalized = storageKey.replaceAll("\\", "/").replace(/^\/+/, "");

  if (!normalized || normalized.includes("..")) {
    throw new HttpError(400, "Invalid storage key");
  }

  return normalized;
}

function resolveLocalStoragePath(storageKey: string): string {
  const normalized = sanitizeStorageKey(storageKey);
  const root = path.resolve(STORAGE_DIR);
  const resolved = path.resolve(root, normalized);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new HttpError(400, "Invalid storage key");
  }

  return resolved;
}

function getS3Config(): S3Config {
  const bucket = process.env.OBJECT_STORAGE_BUCKET?.trim();
  const region = process.env.OBJECT_STORAGE_REGION?.trim() || "auto";
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT?.trim();
  const forcePathStyle = process.env.OBJECT_STORAGE_FORCE_PATH_STYLE === "true";

  if (!bucket) {
    throw new Error("OBJECT_STORAGE_BUCKET is required when OBJECT_STORAGE_DRIVER=s3");
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "OBJECT_STORAGE_ACCESS_KEY_ID and OBJECT_STORAGE_SECRET_ACCESS_KEY are required when OBJECT_STORAGE_DRIVER=s3"
    );
  }

  return {
    bucket,
    region,
    endpoint: endpoint || undefined,
    forcePathStyle,
    accessKeyId,
    secretAccessKey,
  };
}

let cachedS3Client: S3Client | null = null;

function getS3Client(): { client: S3Client; config: S3Config } {
  const config = getS3Config();

  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return {
    client: cachedS3Client,
    config,
  };
}

function buildContentDisposition(fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function getObjectStorageDriver(): ObjectStorageDriver {
  return resolveObjectStorageDriver();
}

export function decodeLocalObjectToken(token: string): LocalObjectTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signLocalTokenPayload(encodedPayload);
  if (!isSafeEqual(signature, expectedSignature)) {
    return null;
  }

  let payloadRaw: unknown;
  try {
    payloadRaw = safeJsonParse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payloadRaw || typeof payloadRaw !== "object") {
    return null;
  }

  const payload = payloadRaw as Partial<LocalObjectTokenPayload>;
  if (!payload.expiresAt || new Date(payload.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  if (payload.op === "upload") {
    if (
      typeof payload.key !== "string" ||
      typeof payload.contentType !== "string" ||
      typeof payload.sizeBytes !== "number"
    ) {
      return null;
    }

    return {
      op: "upload",
      key: payload.key,
      contentType: payload.contentType,
      sizeBytes: payload.sizeBytes,
      expiresAt: payload.expiresAt,
    };
  }

  if (payload.op === "download") {
    if (
      typeof payload.key !== "string" ||
      typeof payload.fileName !== "string" ||
      typeof payload.contentType !== "string"
    ) {
      return null;
    }

    return {
      op: "download",
      key: payload.key,
      fileName: payload.fileName,
      contentType: payload.contentType,
      expiresAt: payload.expiresAt,
    };
  }

  return null;
}

export async function createSignedUploadRequest(params: {
  key: string;
  contentType: string;
  sizeBytes: number;
  origin: string;
  expiresInSeconds?: number;
}): Promise<SignedUploadRequest> {
  const key = sanitizeStorageKey(params.key);
  const expiresInSeconds = params.expiresInSeconds ?? getSignedUrlTtlSeconds();

  if (resolveObjectStorageDriver() === "local") {
    const token = encodeLocalObjectToken({
      op: "upload",
      key,
      contentType: params.contentType,
      sizeBytes: params.sizeBytes,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    });

    return {
      url: `${buildOrigin(params.origin)}/api/files/object?token=${encodeURIComponent(token)}`,
      method: "PUT",
      headers: {
        "Content-Type": params.contentType,
      },
      expiresInSeconds,
    };
  }

  const { client, config } = getS3Client();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: params.contentType,
    ContentLength: params.sizeBytes,
  });

  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

  return {
    url,
    method: "PUT",
    headers: {
      "Content-Type": params.contentType,
    },
    expiresInSeconds,
  };
}

export async function createSignedDownloadRequest(params: {
  key: string;
  fileName: string;
  contentType: string;
  origin: string;
  expiresInSeconds?: number;
}): Promise<SignedDownloadRequest> {
  const key = sanitizeStorageKey(params.key);
  const expiresInSeconds = params.expiresInSeconds ?? getSignedUrlTtlSeconds();

  if (resolveObjectStorageDriver() === "local") {
    const token = encodeLocalObjectToken({
      op: "download",
      key,
      fileName: params.fileName,
      contentType: params.contentType,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    });

    return {
      url: `${buildOrigin(params.origin)}/api/files/object?token=${encodeURIComponent(token)}`,
      method: "GET",
      headers: {},
      expiresInSeconds,
    };
  }

  const { client, config } = getS3Client();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ResponseContentType: params.contentType,
    ResponseContentDisposition: buildContentDisposition(params.fileName),
  });

  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

  return {
    url,
    method: "GET",
    headers: {},
    expiresInSeconds,
  };
}

export async function headObject(key: string): Promise<ObjectHead> {
  const normalizedKey = sanitizeStorageKey(key);

  if (resolveObjectStorageDriver() === "local") {
    const filePath = resolveLocalStoragePath(normalizedKey);
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return { exists: false, sizeBytes: null, contentType: null };
      }

      return {
        exists: true,
        sizeBytes: stats.size,
        contentType: null,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { exists: false, sizeBytes: null, contentType: null };
      }

      throw error;
    }
  }

  const { client, config } = getS3Client();
  try {
    const result = await client.send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: normalizedKey,
      })
    );

    return {
      exists: true,
      sizeBytes: typeof result.ContentLength === "number" ? result.ContentLength : null,
      contentType: result.ContentType ?? null,
    };
  } catch (error) {
    if (error instanceof S3ServiceException) {
      if (error.name === "NotFound" || error.$metadata.httpStatusCode === 404) {
        return { exists: false, sizeBytes: null, contentType: null };
      }
    }

    throw error;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const normalizedKey = sanitizeStorageKey(key);

  if (resolveObjectStorageDriver() === "local") {
    const filePath = resolveLocalStoragePath(normalizedKey);
    await fs.rm(filePath, { force: true });
    return;
  }

  const { client, config } = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: normalizedKey,
    })
  );
}

export async function readLocalObjectFile(storageKey: string): Promise<Buffer> {
  const filePath = resolveLocalStoragePath(storageKey);
  return await fs.readFile(filePath);
}

export async function writeLocalObjectFile(storageKey: string, content: Buffer): Promise<void> {
  const filePath = resolveLocalStoragePath(storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, {
    flag: "wx",
    mode: 0o600,
  });
}
