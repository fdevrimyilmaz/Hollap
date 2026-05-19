import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";

type AccountRow = {
  stripe_account_id: string | null;
  stripe_payouts_enabled: number;
  stripe_account_country: string | null;
};

function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

async function stripeRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) throw new Error("Stripe yapılandırılmamış");
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe API ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request, { role: "creator" });
    const row = (await db
      .prepare(
        "SELECT stripe_account_id, stripe_payouts_enabled, stripe_account_country FROM users WHERE id = ?",
      )
      .get(user.id)) as AccountRow | undefined;

    return NextResponse.json({
      configured: stripeConfigured(),
      accountId: row?.stripe_account_id ?? null,
      payoutsEnabled: row?.stripe_payouts_enabled === 1,
      country: row?.stripe_account_country ?? null,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST creates (or re-uses) a Stripe Express account and returns an onboarding URL.
 * Requires STRIPE_SECRET_KEY — without it the endpoint returns 503 so the UI shows
 * an honest "not configured" state instead of pretending payouts are enabled.
 */
export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const ts = nowIso();

    if (!stripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stripe yapılandırılmamış. Ödeme alabilmek için yöneticinin STRIPE_SECRET_KEY'i ayarlaması gerekir.",
          configured: false,
        },
        { status: 503 },
      );
    }

    const existing = (await db
      .prepare("SELECT stripe_account_id FROM users WHERE id = ?")
      .get(user.id)) as { stripe_account_id: string | null } | undefined;

    const origin = new URL(request.url).origin;

    let accountId = existing?.stripe_account_id ?? null;

    if (!accountId) {
      const params = new URLSearchParams();
      params.set("type", "express");
      params.set("country", "TR");
      params.set("email", user.email);
      params.set("capabilities[transfers][requested]", "true");
      params.set("business_type", "individual");

      const account = (await stripeRequest("/v1/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      })) as { id: string };
      accountId = account.id;

      await db
        .prepare(
          "UPDATE users SET stripe_account_id = ?, stripe_account_country = 'TR', updated_at = ? WHERE id = ?",
        )
        .run(accountId, ts, user.id);
    }

    const linkParams = new URLSearchParams();
    linkParams.set("account", accountId);
    linkParams.set("refresh_url", `${origin}/dashboard?stripe=refresh`);
    linkParams.set("return_url", `${origin}/dashboard?stripe=connected`);
    linkParams.set("type", "account_onboarding");

    const link = (await stripeRequest("/v1/account_links", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: linkParams.toString(),
    })) as { url: string };

    return NextResponse.json({ accountId, onboardingUrl: link.url, devMode: false });
  } catch (error) {
    return authErrorResponse(error);
  }
}
