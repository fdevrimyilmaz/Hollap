import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/server/auth";
import { createId, db, nowIso } from "@/lib/server/db";
import { consumeRateLimit, getClientIp } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(10).max(4_000),
});

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const limit = await consumeRateLimit({
      key: `contact:ip:${clientIp}`,
      maxAttempts: 5,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla istek. Lütfen bir süre sonra tekrar deneyin." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }

    const body = await parseJsonBody(request, contactSchema);

    await db.prepare(
      `
        INSERT INTO contact_messages (id, name, email, message, status, created_at)
        VALUES (?, ?, ?, ?, 'new', ?)
      `
    ).run(
      createId("contact"),
      body.name,
      body.email.toLowerCase(),
      body.message,
      nowIso()
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
