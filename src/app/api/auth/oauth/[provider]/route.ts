import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getCookieSecurityOptions } from "@/lib/server/auth";
import { consumeRateLimit, getClientIp } from "@/lib/server/security";

type OAuthProvider = "google" | "github";

const STATE_TTL_SECONDS = 10 * 60;

function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

function resolveProviderClientId(provider: OAuthProvider): string | null {
  if (provider === "google") {
    return process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? null;
  }
  return process.env.GITHUB_OAUTH_CLIENT_ID?.trim() ?? null;
}

function buildPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function buildAuthUrl(params: {
  provider: OAuthProvider;
  request: Request;
  state: string;
  clientId: string;
  codeChallenge: string;
}): string {
  const redirectUri = new URL(
    `/api/auth/oauth/${params.provider}/callback`,
    params.request.url
  ).toString();

  if (params.provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", params.clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", params.state);
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("code_challenge", params.codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", params.state);
  // GitHub PKCE rolled out in 2023; safe to send even if the app has not
  // explicitly enabled it server-side.
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function loginRedirectWithError(request: Request, code: string): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("oauth", code);
  return NextResponse.redirect(loginUrl);
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
    key: `auth:oauth-init:ip:${getClientIp(request)}`,
    maxAttempts: 20,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
  });

  if (!limiter.allowed) {
    return loginRedirectWithError(request, "rate_limited");
  }

  const clientId = resolveProviderClientId(rawProvider);
  if (!clientId) {
    return loginRedirectWithError(request, "unconfigured_provider");
  }

  const state = randomBytes(24).toString("base64url");
  const pkce = buildPkcePair();
  const authUrl = buildAuthUrl({
    provider: rawProvider,
    request,
    state,
    clientId,
    codeChallenge: pkce.challenge,
  });
  const response = NextResponse.redirect(authUrl);
  const cookieOptions = getCookieSecurityOptions();

  response.cookies.set({
    name: `oauth_state_${rawProvider}`,
    value: state,
    ...cookieOptions,
    maxAge: STATE_TTL_SECONDS,
  });

  response.cookies.set({
    name: `oauth_pkce_${rawProvider}`,
    value: pkce.verifier,
    ...cookieOptions,
    maxAge: STATE_TTL_SECONDS,
  });

  return response;
}
