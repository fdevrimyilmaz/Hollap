// Derive a release tag for error reporting. Explicit value wins; otherwise
// fall back to whatever the build host exposes (Netlify sets COMMIT_REF,
// Vercel sets VERCEL_GIT_COMMIT_SHA, GitHub Actions sets GITHUB_SHA).
const releaseSha =
  process.env.NEXT_PUBLIC_APP_RELEASE?.trim() ||
  process.env.COMMIT_REF?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
  process.env.GITHUB_SHA?.trim() ||
  "";
const releaseTag = releaseSha ? releaseSha.slice(0, 12) : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.preview.same-app.com"],
  poweredByHeader: false,
  env: {
    // Baked into the client bundle at build time so the error-reporting
    // hook can stamp every payload with the deployed git SHA.
    NEXT_PUBLIC_APP_RELEASE: releaseTag,
  },
  // Modern JS only — smaller bundles + faster parse.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
        ],
      },
      // Hashed static asset bundle — safe to cache aggressively.
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Image optimizer cache (1 month, revalidate)
      {
        source: "/_next/image",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, must-revalidate" },
        ],
      },
      // Service worker must always be revalidated; cached SWs cause stale handlers.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  images: {
    unoptimized: true,
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
      "ui-avatars.com",
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
    ],
    remotePatterns: [
      { protocol: "https", hostname: "source.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "ext.same-assets.com", pathname: "/**" },
      { protocol: "https", hostname: "ugc.same-assets.com", pathname: "/**" },
      { protocol: "https", hostname: "ui-avatars.com", pathname: "/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
  },
  experimental: {
    // Tree-shake icons + recharts more aggressively.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

module.exports = nextConfig;
