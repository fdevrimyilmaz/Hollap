import { describe, expect, it, vi } from "vitest";

type SetupOptions = {
  assetRow?: {
    id: string;
    creator_id: string;
    original_name: string;
    storage_path: string;
    mime_type: string;
  };
  grantForUserId?: string;
};

async function setupFilesModule(options: SetupOptions = {}) {
  vi.resetModules();

  class TestHttpError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  vi.doMock("@/lib/server/auth", () => ({
    HttpError: TestHttpError,
  }));

  const createSignedUploadRequest = vi.fn(async () => ({
    url: "https://upload.example.test/file",
    method: "PUT" as const,
    headers: { "Content-Type": "application/pdf" },
    expiresInSeconds: 300,
  }));
  const createSignedDownloadRequest = vi.fn(async () => ({
    url: "https://download.example.test/file",
    method: "GET" as const,
    headers: {},
    expiresInSeconds: 300,
  }));

  vi.doMock("@/lib/server/object-storage", () => ({
    createSignedUploadRequest,
    createSignedDownloadRequest,
    deleteObject: vi.fn(async () => undefined),
    getObjectStorageDriver: vi.fn(() => "local"),
    headObject: vi.fn(async () => ({ exists: true, sizeBytes: 1024, contentType: "application/pdf" })),
  }));

  vi.doMock("@/lib/server/audit", () => ({
    writeAuditLog: vi.fn(),
  }));

  vi.doMock("@/lib/server/db", () => {
    const db = {
      prepare: (sql: string) => {
        const compactSql = sql.replace(/\s+/g, " ");
        return {
          get: async (...args: unknown[]) => {
            if (
              compactSql.includes("FROM file_assets") &&
              compactSql.includes("upload_status = 'uploaded'")
            ) {
              const [assetId] = args as [string];
              if (options.assetRow && options.assetRow.id === assetId) {
                return options.assetRow;
              }
              return undefined;
            }

            if (compactSql.includes("FROM file_grants")) {
              const [, userId] = args as [string, string];
              if (options.grantForUserId && options.grantForUserId === userId) {
                return { id: "fgrant_test_1" };
              }
              return undefined;
            }

            return undefined;
          },
          all: async () => [],
          run: async () => ({ changes: 1 }),
        };
      },
      transaction: async <T>(fn: () => Promise<T> | T): Promise<T> => await fn(),
    };

    return {
      createId: vi.fn(() => "asset_test_1"),
      nowIso: vi.fn(() => "2026-02-12T00:00:00.000Z"),
      db,
    };
  });

  const filesModule = await import("@/lib/server/files");
  return {
    ...filesModule,
    mocks: {
      createSignedUploadRequest,
      createSignedDownloadRequest,
    },
  };
}

describe("file object-storage flow", () => {
  it("rejects unsupported mime type before creating upload URL", async () => {
    const files = await setupFilesModule();

    await expect(
      files.preparePrivateFileUploads({
        creatorId: "usr_creator_demo",
        audience: "vip",
        origin: "http://localhost:3000",
        files: [
          {
            name: "notes.txt",
            size: 1024,
            type: "text/plain",
          },
        ],
      })
    ).rejects.toMatchObject({
      status: 400,
    });

    expect(files.mocks.createSignedUploadRequest).not.toHaveBeenCalled();
  });

  it("rejects unauthorised download URL requests", async () => {
    const files = await setupFilesModule({
      assetRow: {
        id: "asset_123",
        creator_id: "usr_creator_demo",
        original_name: "vip-guide.pdf",
        storage_path: "private/usr_creator_demo/asset_123.pdf",
        mime_type: "application/pdf",
      },
    });

    await expect(
      files.createPrivateDownloadUrl({
        assetId: "asset_123",
        user: {
          id: "usr_other_subscriber",
          name: "Other User",
          email: "other@example.test",
          role: "subscriber",
        },
        origin: "http://localhost:3000",
      })
    ).rejects.toMatchObject({
      status: 403,
    });

    expect(files.mocks.createSignedDownloadRequest).not.toHaveBeenCalled();
  });
});
