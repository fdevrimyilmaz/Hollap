import { randomBytes } from "node:crypto";

function randomToken(byteLength = 48) {
  return randomBytes(byteLength).toString("base64url");
}

async function getVapidKeys() {
  try {
    const module = await import("web-push");
    const webPush = module.default ?? module;
    return webPush.generateVAPIDKeys();
  } catch {
    return null;
  }
}

async function main() {
  const vapidKeys = await getVapidKeys();

  const lines = [
    "# Copy these values into your .env.local or deploy environment settings",
    `APP_JWT_SECRET=${randomToken(48)}`,
    `REFRESH_TOKEN_SECRET=${randomToken(48)}`,
    `PASSWORD_RESET_TOKEN_SECRET=${randomToken(48)}`,
    `EMAIL_VERIFICATION_TOKEN_SECRET=${randomToken(48)}`,
    `FILE_TOKEN_SECRET=${randomToken(48)}`,
    `INTERNAL_CRON_KEY=${randomToken(32)}`,
    `INTERNAL_HEALTH_KEY=${randomToken(32)}`,
  ];

  if (vapidKeys) {
    lines.push(`WEB_PUSH_PUBLIC_KEY=${vapidKeys.publicKey}`);
    lines.push(`WEB_PUSH_PRIVATE_KEY=${vapidKeys.privateKey}`);
  } else {
    lines.push("# WEB_PUSH keys were not generated (web-push module unavailable)");
    lines.push("WEB_PUSH_PUBLIC_KEY=");
    lines.push("WEB_PUSH_PRIVATE_KEY=");
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

void main();
