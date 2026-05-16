import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hollap Core",
  description: "Hollap.com MVP platformu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/teachers" className="font-semibold text-slate-900">
              Hollap Core
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/login">Giris</Link>
              <Link href="/register">Kayit</Link>
              <Link href="/moderator">Moderatör</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
