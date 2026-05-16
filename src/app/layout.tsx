import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientBody from "./ClientBody";
import { ToastProvider } from "@/components/ToastProvider";

const APP_NAME = "Hollap";
const APP_TAGLINE = "Bilgini Paylas, Gelir Elde Et";
const APP_DESCRIPTION =
  "Uzmanlik alaninda kurslar olustur, ozel icerikler paylas ve global bir kitleye ulas. Tutkunu kariyerine donustur.";

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
    default: `${APP_NAME} - ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: APP_NAME }],
  keywords: [
    "creator economy",
    "kurslar",
    "abonelik",
    "icerik uretici",
    "egitim platformu",
    "online kurs",
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
    title: `${APP_NAME} - ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} - ${APP_TAGLINE}`,
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body suppressHydrationWarning className="antialiased">
        <ClientBody>
          {children}
          <ToastProvider />
        </ClientBody>
      </body>
    </html>
  );
}
