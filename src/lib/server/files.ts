import path from "node:path";
import { writeAuditLog } from "@/lib/server/audit";
import { HttpError, type AuthUser } from "@/lib/server/auth";
import { createId, db, nowIso } from "@/lib/server/db";
import {
  createSignedDownloadRequest,
  createSignedUploadRequest,
  deleteObject,
  getObjectStorageDriver,
  headObject,
} from "@/lib/server/object-storage";
import type { FileAudience } from "@/lib/server/types";

type AssetRow = {
  id: string;
  creator_id: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  audience: FileAudience;
  upload_status: "pending" | "uploaded" | "orphaned";
  upload_expires_at: string | null;
  uploaded_at: string | null;
  created_at: string;
};

type UploadFileInput = {
  name: string;
  size: number;
  type: string;
};

export type PreparedUpload = {
  assetId: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  uploadUrl: string;
  uploadMethod: "PUT";
  uploadHeaders: Record<string, string>;
  expiresInSeconds: number;
};

const MAX_UPLOAD_FILES = Number(process.env.FILE_UPLOAD_MAX_FILES ?? 5);
const MAX_UPLOAD_BYTES_PER_FILE = Number(process.env.FILE_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
const MAX_UPLOAD_TOTAL_BYTES = Number(process.env.FILE_UPLOAD_MAX_TOTAL_BYTES ?? 30 * 1024 * 1024);
const STORAGE_KEY_PREFIX = (process.env.OBJECT_STORAGE_KEY_PREFIX ?? "private")
  .trim()
  .replace(/^\/+|\/+$/g, "");

const ALLOWED_MIME_TYPES = new Set([
  // Belgeler
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  // Görseller
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Ses
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
]);

const MIME_EXTENSION: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/webm": ".weba",
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildStoragePath(creatorId: string, assetId: string, mimeType: string): string {
  const extension = MIME_EXTENSION[mimeType];
  const normalizedCreator = creatorId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const parts = [normalizedCreator, `${assetId}${extension}`];
  const key = STORAGE_KEY_PREFIX ? `${STORAGE_KEY_PREFIX}/${parts.join("/")}` : parts.join("/");
  return key.replaceAll("\\", "/");
}

function normalizeMimeType(value: string): string {
  return value.trim().toLowerCase();
}

function assertUploadBatch(files: UploadFileInput[]): void {
  if (!files.length) {
    throw new HttpError(400, "No files provided");
  }

  if (files.length > MAX_UPLOAD_FILES) {
    throw new HttpError(400, `Too many files. Maximum is ${MAX_UPLOAD_FILES}`);
  }

  let totalBytes = 0;

  for (const file of files) {
    const safeName = sanitizeFileName(file.name || "file");
    const mimeType = normalizeMimeType(file.type);

    if (file.size <= 0) {
      throw new HttpError(400, `File is empty: ${safeName}`);
    }

    if (file.size > MAX_UPLOAD_BYTES_PER_FILE) {
      throw new HttpError(
        400,
        `File is too large: ${safeName}. Max size is ${MAX_UPLOAD_BYTES_PER_FILE} bytes`
      );
    }

    totalBytes += file.size;
    if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
      throw new HttpError(
        400,
        `Total upload limit exceeded. Max total size is ${MAX_UPLOAD_TOTAL_BYTES} bytes`
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new HttpError(400, `Unsupported file type: ${safeName}`);
    }
  }
}

function buildInPlaceholders(values: string[]): string {
  return values.map(() => "?").join(", ");
}

async function loadCreatorAssetsByIds(creatorId: string, assetIds: string[]): Promise<AssetRow[]> {
  if (!assetIds.length) {
    return [];
  }

  const rows = await db
    .prepare(
      `
        SELECT
          id,
          creator_id,
          original_name,
          storage_path,
          mime_type,
          size_bytes,
          audience,
          upload_status,
          upload_expires_at,
          uploaded_at,
          created_at
        FROM file_assets
        WHERE creator_id = ? AND id IN (${buildInPlaceholders(assetIds)})
      `
    )
    .all(creatorId, ...assetIds);

  return rows as AssetRow[];
}

export async function preparePrivateFileUploads(params: {
  creatorId: string;
  audience: FileAudience;
  files: UploadFileInput[];
  origin: string;
}): Promise<PreparedUpload[]> {
  assertUploadBatch(params.files);

  const preparedUploads: PreparedUpload[] = [];
  const createdAt = nowIso();
  const storageDriver = getObjectStorageDriver();

  for (const file of params.files) {
    const assetId = createId("asset");
    const safeName = sanitizeFileName(file.name || "file");
    const mimeType = normalizeMimeType(file.type);
    const storagePath = buildStoragePath(params.creatorId, assetId, mimeType);

    const signedUpload = await createSignedUploadRequest({
      key: storagePath,
      contentType: mimeType,
      sizeBytes: file.size,
      origin: params.origin,
    });

    await db
      .prepare(
        `
          INSERT INTO file_assets (
            id,
            creator_id,
            original_name,
            storage_path,
            mime_type,
            size_bytes,
            audience,
            upload_status,
            upload_expires_at,
            uploaded_at,
            storage_provider,
            created_at
          )
          VALUES (
            @id,
            @creator_id,
            @original_name,
            @storage_path,
            @mime_type,
            @size_bytes,
            @audience,
            @upload_status,
            @upload_expires_at,
            NULL,
            @storage_provider,
            @created_at
          )
        `
      )
      .run({
        id: assetId,
        creator_id: params.creatorId,
        original_name: safeName,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: file.size,
        audience: params.audience,
        upload_status: "pending",
        upload_expires_at: new Date(Date.now() + signedUpload.expiresInSeconds * 1000).toISOString(),
        storage_provider: storageDriver,
        created_at: createdAt,
      });

    await writeAuditLog({
      actorUserId: params.creatorId,
      action: "file.upload.prepared",
      entityType: "file_asset",
      entityId: assetId,
      metadata: {
        fileName: safeName,
        mimeType,
        sizeBytes: file.size,
        storagePath,
      },
    });

    preparedUploads.push({
      assetId,
      fileName: safeName,
      sizeBytes: file.size,
      mimeType,
      uploadUrl: signedUpload.url,
      uploadMethod: signedUpload.method,
      uploadHeaders: signedUpload.headers,
      expiresInSeconds: signedUpload.expiresInSeconds,
    });
  }

  return preparedUploads;
}

export async function grantFilesByAudience(params: {
  creatorId: string;
  audience: FileAudience;
  assetIds: string[];
}): Promise<number> {
  let subscribers: Array<{ subscriber_id: string }> = [];

  // Only grant to subscriptions whose paid period (if any) has not lapsed.
  // current_period_end IS NULL means free tier (always valid until canceled).
  const periodGuard =
    "AND (current_period_end IS NULL OR current_period_end > ?)";
  const nowTs = nowIso();

  if (params.audience === "tum-aboneler") {
    subscribers = (await db
      .prepare(
        `SELECT subscriber_id FROM subscriptions
         WHERE creator_id = ?
           AND active = 1
           AND LOWER(COALESCE(stripe_status, '')) IN ('active', 'trialing')
           ${periodGuard}`,
      )
      .all(params.creatorId, nowTs)) as Array<{ subscriber_id: string }>;
  } else if (params.audience === "vip") {
    subscribers = (await db
      .prepare(
        `SELECT subscriber_id FROM subscriptions
         WHERE creator_id = ?
           AND active = 1
           AND LOWER(COALESCE(stripe_status, '')) IN ('active', 'trialing')
           AND LOWER(tier) = 'vip'
           ${periodGuard}`,
      )
      .all(params.creatorId, nowTs)) as Array<{ subscriber_id: string }>;
  } else {
    const limitDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    subscribers = (await db
      .prepare(
        `SELECT subscriber_id FROM subscriptions
         WHERE creator_id = ?
           AND active = 1
           AND LOWER(COALESCE(stripe_status, '')) IN ('active', 'trialing')
           AND created_at >= ?
           ${periodGuard}`,
      )
      .all(params.creatorId, limitDate, nowTs)) as Array<{ subscriber_id: string }>;
  }

  const insertGrant = db.prepare(
    `
      INSERT INTO file_grants (id, asset_id, user_id, granted_via, created_at)
      VALUES (@id, @asset_id, @user_id, @granted_via, @created_at)
      ON CONFLICT(asset_id, user_id) DO NOTHING
    `
  );

  let grantCount = 0;

  await db.transaction(async () => {
    for (const assetId of params.assetIds) {
      for (const subscriber of subscribers) {
        const result = await insertGrant.run({
          id: createId("fgrant"),
          asset_id: assetId,
          user_id: subscriber.subscriber_id,
          granted_via: `audience:${params.audience}`,
          created_at: nowIso(),
        });

        grantCount += result.changes;
      }
    }

    await db
      .prepare(
        `
          INSERT INTO file_dispatches (id, creator_id, audience, files_count, created_at)
          VALUES (@id, @creator_id, @audience, @files_count, @created_at)
        `
      )
      .run({
        id: createId("fdispatch"),
        creator_id: params.creatorId,
        audience: params.audience,
        files_count: params.assetIds.length,
        created_at: nowIso(),
      });
  });

  await writeAuditLog({
    actorUserId: params.creatorId,
    action: "file.dispatched",
    entityType: "file_asset",
    metadata: {
      audience: params.audience,
      assetIds: params.assetIds,
      grantsCreated: grantCount,
    },
  });

  return grantCount;
}

export async function completePrivateFileUploads(params: {
  creatorId: string;
  audience: FileAudience;
  assetIds: string[];
}): Promise<{ filesUploaded: number; grantsCreated: number }> {
  const uniqueAssetIds = Array.from(
    new Set(params.assetIds.map((assetId) => assetId.trim()).filter(Boolean))
  );

  if (!uniqueAssetIds.length) {
    throw new HttpError(400, "No asset ids provided");
  }

  if (uniqueAssetIds.length > MAX_UPLOAD_FILES) {
    throw new HttpError(400, `Too many assets. Maximum is ${MAX_UPLOAD_FILES}`);
  }

  const assets = await loadCreatorAssetsByIds(params.creatorId, uniqueAssetIds);
  if (assets.length !== uniqueAssetIds.length) {
    throw new HttpError(400, "One or more assets are invalid for this creator");
  }

  for (const asset of assets) {
    if (asset.audience !== params.audience) {
      throw new HttpError(400, `Asset audience mismatch for ${asset.id}`);
    }

    if (asset.upload_status === "uploaded") {
      continue;
    }

    if (asset.upload_status !== "pending") {
      throw new HttpError(400, `Asset is not uploadable: ${asset.id}`);
    }

    const objectState = await headObject(asset.storage_path);
    if (!objectState.exists) {
      throw new HttpError(400, `Upload not found for asset ${asset.id}`);
    }

    if (objectState.sizeBytes !== null && objectState.sizeBytes !== asset.size_bytes) {
      throw new HttpError(400, `File size mismatch for asset ${asset.id}`);
    }

    if (
      objectState.contentType &&
      objectState.contentType.trim().toLowerCase() !== asset.mime_type.trim().toLowerCase()
    ) {
      throw new HttpError(400, `File MIME type mismatch for asset ${asset.id}`);
    }

    await db
      .prepare(
        `
          UPDATE file_assets
          SET upload_status = 'uploaded', uploaded_at = ?, upload_expires_at = NULL
          WHERE id = ?
        `
      )
      .run(nowIso(), asset.id);

    await writeAuditLog({
      actorUserId: params.creatorId,
      action: "file.upload.completed",
      entityType: "file_asset",
      entityId: asset.id,
      metadata: {
        storagePath: asset.storage_path,
      },
    });
  }

  const grantsCreated = await grantFilesByAudience({
    creatorId: params.creatorId,
    audience: params.audience,
    assetIds: uniqueAssetIds,
  });

  return {
    filesUploaded: uniqueAssetIds.length,
    grantsCreated,
  };
}

export async function canUserAccessAsset(user: AuthUser, assetId: string): Promise<boolean> {
  const asset = (await db
    .prepare(
      `
        SELECT id, creator_id
        FROM file_assets
        WHERE id = ? AND upload_status = 'uploaded' AND deleted_at IS NULL
      `
    )
    .get(assetId)) as { id: string; creator_id: string } | undefined;

  if (!asset) {
    return false;
  }

  if (asset.creator_id === user.id) {
    return true;
  }

  const grant = (await db
    .prepare("SELECT id FROM file_grants WHERE asset_id = ? AND user_id = ?")
    .get(assetId, user.id)) as { id: string } | undefined;

  return Boolean(grant);
}

export async function createPrivateDownloadUrl(params: {
  assetId: string;
  user: AuthUser;
  origin: string;
}): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
  const asset = (await db
    .prepare(
      `
        SELECT id, creator_id, original_name, storage_path, mime_type
        FROM file_assets
        WHERE id = ? AND upload_status = 'uploaded' AND deleted_at IS NULL
      `
    )
    .get(params.assetId)) as
    | {
        id: string;
        creator_id: string;
        original_name: string;
        storage_path: string;
        mime_type: string;
      }
    | undefined;

  if (!asset) {
    throw new HttpError(404, "Asset not found");
  }

  let allowed = asset.creator_id === params.user.id;
  if (!allowed) {
    const grant = (await db
      .prepare("SELECT id FROM file_grants WHERE asset_id = ? AND user_id = ?")
      .get(asset.id, params.user.id)) as { id: string } | undefined;
    allowed = Boolean(grant);
  }

  if (!allowed) {
    throw new HttpError(403, "Access denied");
  }

  const signedDownload = await createSignedDownloadRequest({
    key: asset.storage_path,
    fileName: asset.original_name,
    contentType: asset.mime_type,
    origin: params.origin,
  });

  await writeAuditLog({
    actorUserId: params.user.id,
    action: "file.download.signed_url_issued",
    entityType: "file_asset",
    entityId: asset.id,
    metadata: {
      expiresInSeconds: signedDownload.expiresInSeconds,
      storageDriver: getObjectStorageDriver(),
    },
  });

  return {
    downloadUrl: signedDownload.url,
    expiresInSeconds: signedDownload.expiresInSeconds,
  };
}

export async function cleanupExpiredPendingUploads(limit = 50): Promise<{
  scanned: number;
  cleaned: number;
}> {
  const rows = (await db
    .prepare(
      `
        SELECT id, storage_path
        FROM file_assets
        WHERE upload_status = 'pending'
          AND upload_expires_at IS NOT NULL
          AND upload_expires_at < ?
        ORDER BY upload_expires_at ASC
        LIMIT ?
      `
    )
    .all(nowIso(), Math.max(1, Math.floor(limit)))) as Array<{
    id: string;
    storage_path: string;
  }>;

  let cleaned = 0;
  const deletedAt = nowIso();

  for (const row of rows) {
    await deleteObject(row.storage_path).catch(() => undefined);

    await db
      .prepare(
        `
          UPDATE file_assets
          SET upload_status = 'orphaned', deleted_at = ?, upload_expires_at = NULL
          WHERE id = ?
        `
      )
      .run(deletedAt, row.id);

    cleaned += 1;
  }

  return {
    scanned: rows.length,
    cleaned,
  };
}

export function resolveStoragePath(relativePath: string): string {
  return path.join(process.cwd(), "storage", "private", relativePath);
}
