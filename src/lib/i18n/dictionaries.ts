export type Locale = "tr" | "en";

export const LOCALES: Locale[] = ["tr", "en"];

export const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
};

export const DEFAULT_LOCALE: Locale = "tr";

/**
 * Translation dictionary. Keep keys descriptive and grouped by domain.
 * Missing keys fall back to the Turkish source.
 */
export const TRANSLATIONS = {
  tr: {
    "nav.discover": "Keşfet",
    "nav.categories": "Kategoriler",
    "nav.creators": "Yaratıcılar",
    "nav.pricing": "Fiyatlandırma",
    "nav.signIn": "Giriş",
    "nav.signUp": "Kayıt Ol",
    "nav.createAccount": "Ücretsiz Hesap Oluştur",
    "nav.dashboard": "Panel",
    "nav.signOut": "Çıkış Yap",
    "nav.searchPlaceholder": "Kurs, yaratıcı veya kategori ara…",

    "hero.activeCreators": "{count} aktif yaratıcı şu an üretiyor",
    "hero.titleA": "Bilgini Paylaş,",
    "hero.titleB": "Gelir Elde Et",
    "hero.subtitle":
      "Uzmanlık alanında kurslar oluştur, özel içerikler paylaş ve global bir kitleye ulaş. Tutkunu sürdürülebilir bir kariyere dönüştür.",
    "hero.cta.discover": "Keşfetmeye Başla",
    "hero.cta.becomeCreator": "Yaratıcı Ol",
    "hero.studentsHappy": "mutlu öğrenci",

    "cta.ready": "Bilgini paylaşmaya",
    "cta.ready2": "hazır mısın?",
    "cta.subtitle":
      "Binlerce yaratıcı gibi sen de tutkunu kariyerine dönüştür. Ücretsiz başla, yalnızca kazandığında küçük bir komisyon öde.",
    "cta.startFree": "Ücretsiz Başla",
    "cta.howItWorks": "Nasıl Çalışır?",

    "common.subscribe": "Abone Ol",
    "common.unsubscribe": "Aboneliği İptal Et",
    "common.loading": "Yükleniyor…",
    "common.save": "Kaydet",
    "common.cancel": "İptal",
    "common.delete": "Sil",
    "common.edit": "Düzenle",
    "common.upload": "Yükle",

    "footer.allSystems": "Tüm sistemler çalışıyor",
    "footer.designedIn": "Türkiye'de tasarlandı",
  },
  en: {
    "nav.discover": "Discover",
    "nav.categories": "Categories",
    "nav.creators": "Creators",
    "nav.pricing": "Pricing",
    "nav.signIn": "Sign in",
    "nav.signUp": "Sign up",
    "nav.createAccount": "Create free account",
    "nav.dashboard": "Dashboard",
    "nav.signOut": "Sign out",
    "nav.searchPlaceholder": "Search courses, creators or categories…",

    "hero.activeCreators": "{count} active creators right now",
    "hero.titleA": "Share Your Knowledge,",
    "hero.titleB": "Earn Income",
    "hero.subtitle":
      "Create courses, share exclusive content and reach a global audience. Turn your passion into a sustainable career.",
    "hero.cta.discover": "Start Exploring",
    "hero.cta.becomeCreator": "Become a Creator",
    "hero.studentsHappy": "happy students",

    "cta.ready": "Ready to share",
    "cta.ready2": "your knowledge?",
    "cta.subtitle":
      "Join thousands of creators turning their passion into a career. Start free; only pay a small commission when you earn.",
    "cta.startFree": "Start Free",
    "cta.howItWorks": "How It Works",

    "common.subscribe": "Subscribe",
    "common.unsubscribe": "Cancel subscription",
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.upload": "Upload",

    "footer.allSystems": "All systems operational",
    "footer.designedIn": "Crafted in Türkiye",
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS["tr"];
