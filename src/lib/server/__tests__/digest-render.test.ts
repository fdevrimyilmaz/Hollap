import { describe, expect, it } from "vitest";
import { renderDigestHtml } from "@/lib/server/digest";

describe("renderDigestHtml", () => {
  const baseStats = {
    salesCount: 12,
    grossCents: 19900,
    netCents: 15920,
    newSubscribers: 3,
    newReviews: 5,
  };

  it("includes the creator name and brand", () => {
    const html = renderDigestHtml({
      creatorName: "Ayşe Kara",
      stats: baseStats,
      baseUrl: "https://hollap.test",
    });
    expect(html).toContain("Ayşe Kara");
    expect(html).toContain("Hollap haftalık özet");
  });

  it("formats currency in USD", () => {
    const html = renderDigestHtml({
      creatorName: "Test",
      stats: baseStats,
      baseUrl: "https://hollap.test",
    });
    expect(html).toContain("$199.00");
    expect(html).toContain("$159.20");
  });

  it("renders each metric in the table", () => {
    const html = renderDigestHtml({
      creatorName: "Test",
      stats: baseStats,
      baseUrl: "https://hollap.test",
    });
    expect(html).toContain("Satış");
    expect(html).toContain("Brüt gelir");
    expect(html).toContain("Net kazanç (%80)");
    expect(html).toContain("Yeni abone");
    expect(html).toContain("Yeni yorum");
  });

  it("links back to analytics with the supplied base URL", () => {
    const html = renderDigestHtml({
      creatorName: "Test",
      stats: baseStats,
      baseUrl: "https://app.hollap.com",
    });
    expect(html).toContain("https://app.hollap.com/dashboard/analytics");
    expect(html).toContain("https://app.hollap.com/dashboard/settings");
  });

  it("handles zero counts without breaking", () => {
    const html = renderDigestHtml({
      creatorName: "Quiet Creator",
      stats: { salesCount: 0, grossCents: 0, netCents: 0, newSubscribers: 0, newReviews: 0 },
      baseUrl: "https://hollap.test",
    });
    expect(html).toContain("Quiet Creator");
    expect(html).toContain("$0.00");
  });
});
