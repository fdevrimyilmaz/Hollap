import { z, type ZodTypeAny } from "zod";
import { HttpError } from "@/lib/server/auth";

function formatIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "body";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export async function parseJsonBody<TSchema extends ZodTypeAny>(
  request: Request,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    throw new HttpError(400, `Invalid request payload: ${formatIssues(parsed.error)}`);
  }

  return parsed.data;
}

export function parseInput<TSchema extends ZodTypeAny>(
  input: unknown,
  schema: TSchema,
  message = "Invalid request payload"
): z.infer<TSchema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(400, `${message}: ${formatIssues(parsed.error)}`);
  }

  return parsed.data;
}