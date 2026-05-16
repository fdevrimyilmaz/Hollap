import { describe, expect, it } from "vitest";
import { getClientIp, getUserAgent } from "@/lib/server/request-context";

function buildRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/test", { headers });
}

describe("getClientIp", () => {
  it("prefers Netlify x-nf-client-connection-ip over everything else", () => {
    const req = buildRequest({
      "x-nf-client-connection-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.1, 198.51.100.2",
      "x-real-ip": "198.51.100.3",
    });
    expect(getClientIp(req)).toBe("203.0.113.10");
  });

  it("prefers Vercel x-vercel-forwarded-for when Netlify header absent", () => {
    const req = buildRequest({
      "x-vercel-forwarded-for": "203.0.113.20",
      "x-forwarded-for": "198.51.100.1",
    });
    expect(getClientIp(req)).toBe("203.0.113.20");
  });

  it("prefers Cloudflare cf-connecting-ip when no Netlify/Vercel headers", () => {
    const req = buildRequest({
      "cf-connecting-ip": "203.0.113.30",
      "x-forwarded-for": "198.51.100.1",
    });
    expect(getClientIp(req)).toBe("203.0.113.30");
  });

  it("falls back to x-real-ip when no trusted platform headers present", () => {
    const req = buildRequest({
      "x-real-ip": "203.0.113.40",
      "x-forwarded-for": "198.51.100.1",
    });
    expect(getClientIp(req)).toBe("203.0.113.40");
  });

  it("uses LAST hop of x-forwarded-for, not first (anti-spoof)", () => {
    // First hop is client-controlled and could be a spoofed IP. The platform
    // appends its own observation as the last entry.
    const req = buildRequest({
      "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12",
    });
    expect(getClientIp(req)).toBe("9.10.11.12");
  });

  it("returns 'unknown' when no IP-bearing header is present", () => {
    const req = buildRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace in x-forwarded-for entries", () => {
    const req = buildRequest({
      "x-forwarded-for": "1.2.3.4 ,   5.6.7.8",
    });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("ignores empty trusted header values and continues fallback chain", () => {
    const req = buildRequest({
      "x-nf-client-connection-ip": "",
      "x-real-ip": "203.0.113.99",
    });
    expect(getClientIp(req)).toBe("203.0.113.99");
  });
});

describe("getUserAgent", () => {
  it("returns the user-agent header verbatim within length cap", () => {
    const req = buildRequest({ "user-agent": "Mozilla/5.0 (Test Suite)" });
    expect(getUserAgent(req)).toBe("Mozilla/5.0 (Test Suite)");
  });

  it("returns 'unknown' when user-agent missing", () => {
    const req = buildRequest({});
    expect(getUserAgent(req)).toBe("unknown");
  });

  it("truncates pathologically long user-agent strings to 255 chars", () => {
    const huge = "X".repeat(2000);
    const req = buildRequest({ "user-agent": huge });
    expect(getUserAgent(req).length).toBe(255);
  });
});
