import { InfoPage } from "@/components/page/InfoPage";

export default function FaqPage() {
  return (
    <InfoPage
      badge="SSS"
      title="Sikca Sorulan Sorular"
      description="Hesap, odeme, icerik yayini ve topluluk sureciyle ilgili en cok sorulan sorulari burada bulabilirsin."
      primaryCta={{ label: "Yardim Merkezi", href: "/help" }}
      secondaryCta={{ label: "Iletisim", href: "/contact" }}
      sections={[
        {
          title: "Yaratici olarak nasil baslarim?",
          description: "Kayit olduktan sonra profilini tamamlayip ilk kursunu veya abonelik planini panelden olusturabilirsin.",
        },
        {
          title: "Odeme ne kadar surer?",
          description: "Planina gore odeme periyodu degisir; detaylar fiyatlandirma sayfasinda aciklanir.",
        },
        {
          title: "Iade politikaniz nedir?",
          description: "Kurs odemeleri icin belirli bir sure icinde iade talebi olusturabilirsin.",
        },
        {
          title: "Canli yayin nasil acilir?",
          description: "Dashboard uzerinden canli yayin oturumu olusturup tek tusla yayina gecebilirsin.",
        },
      ]}
    />
  );
}
