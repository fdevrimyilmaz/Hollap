import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import {
  attachAuthCookies,
  getCookieSecurityOptions,
  startUserSession,
  type AuthUser,
} from "@/lib/server/auth";
import { createId, db, nowIso } from "@/lib/server/db";
import { consumeRateLimit, getClientIp } from "@/lib/server/security";
import type { UserRole } from "@/lib/server/types";

type OAuthProvider = "google" | "github";

type ExistingUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  email_verified_at: string | null;
};

type OAuthProfile = {
  email: string;
  name: string;
};

function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

function loginRedirectWithError(request: Request, code: string): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("oauth", code);
  return NextResponse.redirect(loginUrl);
}

function readCookie(request: Request, cookieName: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  const parts = header.split(";").map((part) => part.trim());

  for (const part of parts) {
    const [name, ...rawValue] = part.split("=");
    if (name === cookieName) {
      return rawValue.length ? decodeURIComponent(rawValue.join("=")) : "";
    }
  }

  return null;
}

function resolveProviderSecret(provider: OAuthProvider): {
  clientId: string | null;
  clientSecret: string | null;
} {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? null,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? null,
    };
  }

  return {
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID?.trim() ?? null,
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim() ?? null,
  };
}

async function exchangeGoogleCode(params: {
  request: Request;
  code: string;
  clientId: string;
  clientSecret: string;
  codeVerifier: string;
}): Promise<OAuthProfile | null> {
  const redirectUri = new URL("/api/auth/oauth/google/callback", params.request.url).toString();
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: params.codeVerifier,
  });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return null;
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenPayload.access_token) {
    return null;
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
    cache: "no-store",
  });

  if (!profileResponse.ok) {
    return null;
  }

  const profile = (await profileResponse.json()) as {
    email?: string;
    name?: string;
  };

  if (!profile.email) {
    return null;
  }

  return {
    email: profile.email.trim().toLowerCase(),
    name: profile.name?.trim() || profile.email.split("@")[0] || "Kullanici",
  };
}

async function exchangeGithubCode(params: {
  request: Request;
  code: string;
  clientId: string;
  clientSecret: string;
  codeVerifier: string;
}): Promise<OAuthProfile | null> {
  const redirectUri = new URL("/api/auth/oauth/github/callback", params.request.url).toString();
  const tokenBody = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: redirectUri,
    code_verifier: params.codeVerifier,
  });

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenBody.toString(),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    return null;
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenPayload.access_token) {
    return null;
  }

  const [userResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "hollap-app",
      },
      cache: "no-store",
    }),
    fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "hollap-app",
      },
      cache: "no-store",
    }),
  ]);

  if (!userResponse.ok || !emailsResponse.ok) {
    return null;
  }

  const user = (await userResponse.json()) as { name?: string; login?: string };
  const emails = (await emailsResponse.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;

  const primaryEmail =
    emails.find((email) => email.primary && email.verified)?.email ??
    emails.find((email) => email.verified)?.email;

  if (!primaryEmail) {
    return null;
  }

  return {
    email: primaryEmail.trim().toLowerCase(),
    name: user.name?.trim() || user.login?.trim() || primaryEmail.split("@")[0] || "Kullanici",
  };
}

async function resolveOAuthProfile(params: {
  provider: OAuthProvider;
  request: Request;
  code: string;
  clientId: string;
  clientSecret: string;
  codeVerifier: string;
}): Promise<OAuthProfile | null> {
  if (params.provider === "google") {
    return exchangeGoogleCode({
      request: params.request,
      code: params.code,
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      codeVerifier: params.codeVerifier,
    });
  }

  return exchangeGithubCode({
    request: params.request,
    code: params.code,
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    codeVerifier: params.codeVerifier,
  });
}

async function upsertOAuthUser(profile: OAuthProfile): Promise<AuthUser> {
  const existing = await db
    .prepare(
      `
        SELECT id, name, email, role, email_verified_at
        FROM users
        WHERE LOWER(email) = LOWER(?)
      `
    )
    .get(profile.email) as ExistingUserRow | undefined;

  if (existing) {
    if (!existing.email_verified_at) {
      await db
        .prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?")
        .run(nowIso(), nowIso(), existing.id);
    }

    return {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      role: existing.role,
    };
  }

  const id = createId("usr");
  const now = nowIso();
  const passwordHash = await hash(randomBytes(24).toString("base64url"), 10);

  await db.prepare(
    `
      INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'subscriber', ?, ?, ?)
    `
  ).run(id, profile.name, profile.email, passwordHash, now, now, now);

  return {
    id,
    name: profile.name,
    email: profile.email,
    role: "subscriber",
  };
}

function clearOAuthFlowCookies(response: NextResponse, provider: OAuthProvider): void {
  const cookieOptions = getCookieSecurityOptions();
  response.cookies.set({
    name: `oauth_state_${provider}`,
    value: "",
    ...cookieOptions,
    maxAge: 0,
  });
  response.cookies.set({
    name: `oauth_pkce_${provider}`,
    value: "",
    ...cookieOptions,
    maxAge: 0,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await context.params;
  if (!isOAuthProvider(rawProvider)) {
    return loginRedirectWithError(request, "unsupported_provider");
  }

  const limiter = await consumeRateLimit({
    key: `auth:oauth-callback:ip:${getClientIp(request)}`,
    maxAttempts: 30,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
  });

  if (!limiter.allowed) {
    return loginRedirectWithError(request, "rate_limited");
  }

  try {
    const url = new URL(request.url);
    const state = url.searchParams.get("state")?.trim() ?? "";
    const code = url.searchParams.get("code")?.trim() ?? "";
    const cookieState = readCookie(request, `oauth_state_${rawProvider}`);
    const codeVerifier = readCookie(request, `oauth_pkce_${rawProvider}`) ?? "";

    if (!state || !code || !cookieState || state !== cookieState || !codeVerifier) {
      const response = loginRedirectWithError(request, "state_mismatch");
      clearOAuthFlowCookies(response, rawProvider);
      return response;
    }

    const credentials = resolveProviderSecret(rawProvider);
    if (!credentials.clientId || !credentials.clientSecret) {
      const response = loginRedirectWithError(request, "unconfigured_provider");
      clearOAuthFlowCookies(response, rawProvider);
      return response;
    }

    const profile = await resolveOAuthProfile({
      provider: rawProvider,
      request,
      code,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      codeVerifier,
    });

    if (!profile) {
      const response = loginRedirectWithError(request, "profile_unavailable");
      clearOAuthFlowCookies(response, rawProvider);
      return response;
    }

    const user = await upsertOAuthUser(profile);
    const session = await startUserSession({ user, request });
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    attachAuthCookies(response, {
      accessToken: session.accessToken,
      refreshCookieValue: session.refreshCookieValue,
    });
    clearOAuthFlowCookies(response, rawProvider);

    return response;
  } catch {
    const response = loginRedirectWithError(request, "oauth_failed");
    clearOAuthFlowCookies(response, rawProvider);
    return response;
  }
}
