import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export async function hashPassword(value: string) {
  return bcrypt.hash(value, 10);
}

export async function comparePassword(value: string, hash: string) {
  return bcrypt.compare(value, hash);
}

export function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
