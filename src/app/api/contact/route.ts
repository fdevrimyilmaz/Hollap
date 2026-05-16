import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError } from "@/lib/server/auth";
import { createId, db, nowIso } from "@/lib/server/db";
import { parseJsonBody } from "@/lib/server/validation";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(10).max(4_000),
});

export async function POST(request: Request) {
  try {
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
