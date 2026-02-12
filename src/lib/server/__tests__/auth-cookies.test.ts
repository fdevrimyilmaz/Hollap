import { afterEach, describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, attachSessionCookie, clearSessionCookie } from "@/lib/server/auth";

const originalNodeEnv = process.env.NODE_ENV;
const originalCookieSecure = process.env.AUTH_COOKIE_SECURE;
const originalCookieSameSite = process.env.AUTH_COOKIE_SAME_SITE;
const mutableEnv = process.env as Record<string, string | undefined>;

afterEach(() => {
  mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalCookieSecure === undefined) {
    delete process.env.AUTH_COOKIE_SECURE;
  } else {
    process.env.AUTH_COOKIE_SECURE = originalCookieSecure;
  }

  if (originalCookieSameSite === undefined) {
    delete process.env.AUTH_COOKIE_SAME_SITE;
  } else {
    process.env.AUTH_COOKIE_SAME_SITE = originalCookieSameSite;
  }
});

function readSetCookieHeader(response: NextResponse): string {
  return (response.headers.get("set-cookie") ?? "").toLowerCase();
}

describe("auth cookie security policy", () => {
  it("uses secure cookies by default in production", () => {
    mutableEnv.NODE_ENV = "production";
    delete process.env.AUTH_COOKIE_SECURE;
    delete process.env.AUTH_COOKIE_SAME_SITE;

    const response = NextResponse.json({ ok: true });
    attachSessionCookie(response, "session-token");
    const header = readSetCookieHeader(response);

    expect(header).toContain(`${SESSION_COOKIE}=session-token`);
    expect(header).toContain("httponly");
    expect(header).toContain("secure");
    expect(header).toContain("samesite=lax");
  });

  it("supports strict same-site policy via env", () => {
    mutableEnv.NODE_ENV = "development";
    process.env.AUTH_COOKIE_SECURE = "false";
    process.env.AUTH_COOKIE_SAME_SITE = "strict";

    const response = NextResponse.json({ ok: true });
    attachSessionCookie(response, "session-token");
    const header = readSetCookieHeader(response);

    expect(header).toContain("samesite=strict");
    expect(header).not.toContain("secure");
  });

  it("forces secure when same-site is none", () => {
    mutableEnv.NODE_ENV = "development";
    process.env.AUTH_COOKIE_SECURE = "false";
    process.env.AUTH_COOKIE_SAME_SITE = "none";

    const response = NextResponse.json({ ok: true });
    attachSessionCookie(response, "session-token");
    const header = readSetCookieHeader(response);

    expect(header).toContain("samesite=none");
    expect(header).toContain("secure");
  });

  it("applies the same security attributes while clearing cookies", () => {
    mutableEnv.NODE_ENV = "production";
    process.env.AUTH_COOKIE_SAME_SITE = "strict";
    process.env.AUTH_COOKIE_SECURE = "true";

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    const header = readSetCookieHeader(response);

    expect(header).toContain(`${SESSION_COOKIE}=`);
    expect(header).toContain("max-age=0");
    expect(header).toContain("httponly");
    expect(header).toContain("secure");
    expect(header).toContain("samesite=strict");
  });
});
