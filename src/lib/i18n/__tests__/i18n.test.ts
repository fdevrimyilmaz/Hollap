import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, TRANSLATIONS } from "@/lib/i18n/dictionaries";

describe("i18n dictionaries", () => {
  it("has matching keys across all locales", () => {
    const baseKeys = Object.keys(TRANSLATIONS[DEFAULT_LOCALE]).sort();
    for (const locale of LOCALES) {
      const keys = Object.keys(TRANSLATIONS[locale]).sort();
      expect(keys).toEqual(baseKeys);
    }
  });

  it("default locale is in supported locales", () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });

  it("each locale has at least the core navigation keys", () => {
    const required = ["nav.discover", "nav.signIn", "nav.signUp", "common.loading"];
    for (const locale of LOCALES) {
      for (const key of required) {
        const value = (TRANSLATIONS[locale] as Record<string, string>)[key];
        expect(value, `${locale} missing ${key}`).toBeTruthy();
      }
    }
  });

  it("interpolation placeholders match the {key} format", () => {
    // The reference key must not contain stray $ markers — only {var} style.
    const heroKey = TRANSLATIONS[DEFAULT_LOCALE]["hero.activeCreators"];
    expect(heroKey).toMatch(/\{count\}/);
    expect(heroKey).not.toMatch(/\$\{/);
  });
});
