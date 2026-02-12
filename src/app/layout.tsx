import type { Metadata } from "next";
import "./globals.css";
import ClientBody from "./ClientBody";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "Hollap - Bilgini Paylas, Gelir Elde Et",
  description:
    "Uzmanlik alaninda kurslar olustur, ozel icerikler paylas ve global bir kitleye ulas. Tutkunu kariyerine donustur.",
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
