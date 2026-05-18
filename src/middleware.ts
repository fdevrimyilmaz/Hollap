import { NextResponse, type NextRequest } from "next/server";

function buildCsp(nonce: string): string {
  // Keep nonce support for dynamic script/style tags, but allow inline
  // bootstrap content so statically rendered Next.js pages can hydrate in
  // production. `script-src-attr 'none'` still blocks inline event handlers.
  const scriptSrc = `script-src 'self' 'nonce-${nonce}' 'unsafe-inline'`;
  const styleSrc = `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`;

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSrc,
    "script-src-attr 'none'",
    styleSrc,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss:",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-csp-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
