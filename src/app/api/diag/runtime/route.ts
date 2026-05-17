import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const REQUIRED_ENV_KEYS = [
  "APP_JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
  "PASSWORD_RESET_TOKEN_SECRET",
  "EMAIL_VERIFICATION_TOKEN_SECRET",
  "FILE_TOKEN_SECRET",
  "APP_BASE_URL",
  "APP_ALLOWED_ORIGINS",
  "OBJECT_STORAGE_DRIVER",
  "DATABASE_URL",
  "DATABASE_URL_PRODUCTION",
  "DATABASE_URL_PREVIEW",
  "AUTH_COOKIE_SECURE",
] as const;

type DiagnosticError = {
  code?: string;
  message: string;
};

function toDiagnosticError(error: unknown): DiagnosticError {
  if (error instanceof Error) {
    const code = (error as { code?: string }).code;
    return {
      code,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

function hasEnv(key: string): boolean {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  const requiredEnv = Object.fromEntries(
    REQUIRED_ENV_KEYS.map((key) => [key, hasEnv(key)])
  );

  const tmpFilePath = path.join(
    "/tmp",
    `hollap-runtime-diag-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
  );
  let tmpWriteTest: { ok: true; path: string } | { ok: false; path: string; error: DiagnosticError };
  try {
    fs.writeFileSync(tmpFilePath, "runtime-diag-ok", "utf8");
    fs.unlinkSync(tmpFilePath);
    tmpWriteTest = { ok: true, path: tmpFilePath };
  } catch (error) {
    tmpWriteTest = {
      ok: false,
      path: tmpFilePath,
      error: toDiagnosticError(error),
    };
  }

  const storagePrivatePath = path.join(process.cwd(), "storage", "private");
  let storagePrivateMkdirTest:
    | { ok: true; path: string }
    | { ok: false; path: string; error: DiagnosticError };
  try {
    fs.mkdirSync(storagePrivatePath, { recursive: true });
    storagePrivateMkdirTest = { ok: true, path: storagePrivatePath };
  } catch (error) {
    storagePrivateMkdirTest = {
      ok: false,
      path: storagePrivatePath,
      error: toDiagnosticError(error),
    };
  }

  let dbImportTest:
    | { ok: true }
    | { ok: false; error: DiagnosticError };
  try {
    await import("@/lib/server/db");
    dbImportTest = { ok: true };
  } catch (error) {
    dbImportTest = {
      ok: false,
      error: toDiagnosticError(error),
    };
  }

  return NextResponse.json(
    {
      nodeEnvPresent: hasEnv("NODE_ENV"),
      netlifyPresent: hasEnv("NETLIFY"),
      contextPresent: hasEnv("CONTEXT"),
      requiredEnv,
      cwd: process.cwd(),
      tmpWriteTest,
      storagePrivateMkdirTest,
      dbImportTest,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
