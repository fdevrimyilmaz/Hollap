import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import { ToastProvider } from "@/components/ToastProvider";

const APP_NAME = "Hollap";
const APP_TAGLINE = "Bilgini Paylaş, Gelir Elde Et";
const APP_DESCRIPTION =
  "Uzmanlık alanında kurslar oluştur, özel içerikler paylaş ve global bir kitleye ulaş. Tutkunu kariyerine dönüştür.";

const sans = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

function resolveBaseUrl(): URL {
  const raw = process.env.APP_BASE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw);
    } catch {
      // fall through to default
    }
  }
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: resolveBaseUrl(),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: APP_NAME }],
  keywords: [
    "creator economy",
    "online kurs",
    "abonelik",
    "içerik üretici",
    "eğitim platformu",
    "dijital ürün",
    "yaratıcı ekonomi",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: "/favicon.ico",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${sans.variable} ${display.variable} dark`}>
      <body suppressHydrationWarning className="antialiased font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-orange-500 focus:text-white focus:shadow-lg"
        >
          İçeriğe atla
        </a>
        <ClientBody>
          {children}
          <ToastProvider />
        </ClientBody>
      </body>
    </html>
  );
}
