import { describe, expect, it } from "vitest";
import { createCreatorUsername, toSlug } from "@/lib/server/catalog";

describe("toSlug", () => {
  it("transliterates Turkish characters", () => {
    expect(toSlug("Ayşe Kara")).toBe("ayse-kara");
    expect(toSlug("Burak Öztürk")).toBe("burak-ozturk");
    expect(toSlug("İçerik Üretimi")).toBe("icerik-uretimi");
    expect(toSlug("ÇIĞDEM ŞEN")).toBe("cigdem-sen");
  });

  it("collapses spaces and punctuation to single dashes", () => {
    expect(toSlug("Hello   World!!!")).toBe("hello-world");
    expect(toSlug("foo--bar---baz")).toBe("foo-bar-baz");
  });

  it("trims leading/trailing dashes", () => {
    expect(toSlug("  --hello--  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(toSlug("")).toBe("");
    expect(toSlug("@#$%")).toBe("");
  });
});

describe("createCreatorUsername", () => {
  it("combines slug + last 6 chars of id", () => {
    const username = createCreatorUsername(
      "Ayşe Kara",
      "usr_b9964b65-fd07-4813-ae76-1838f6d9912d",
    );
    expect(username).toBe("ayse-kara-d9912d");
  });

  it("handles empty name gracefully", () => {
    const username = createCreatorUsername("", "usr_abc123def456");
    expect(username).toContain("creator");
    expect(username).toContain("3def456".slice(-6));
  });

  it("handles empty id gracefully", () => {
    expect(createCreatorUsername("Test User", "")).toBe("test-user");
  });

  it("falls back when both inputs are empty", () => {
    expect(createCreatorUsername("", "")).toBe("creator");
  });

  it("is deterministic", () => {
    const a = createCreatorUsername("Mehmet Yılmaz", "usr_22ebe0aaa");
    const b = createCreatorUsername("Mehmet Yılmaz", "usr_22ebe0aaa");
    expect(a).toBe(b);
  });
});
