import type { Metadata } from "next";
import { InfoPage } from "@/components/page/InfoPage";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description: "Hesap, ödeme, içerik yayını ve topluluk süreciyle ilgili en çok sorulan soruların yanıtları.",
};

export default function FaqPage() {
  return (
    <InfoPage
      badge="SSS"
      title="Sıkça sorulan sorular"
      description="Hesap, ödeme, içerik yayını ve topluluk süreciyle ilgili en çok sorulan soruların yanıtlarını burada bulabilirsin."
      primaryCta={{ label: "Yardım Merkezi", href: "/help" }}
      secondaryCta={{ label: "İletişim", href: "/contact" }}
      sections={[
        {
          title: "Yaratıcı olarak nasıl başlarım?",
          description:
            "Kayıt olduktan sonra profilini tamamlayıp ilk kursunu veya abonelik planını panelden oluşturabilirsin.",
        },
        {
          title: "Ödeme ne kadar sürer?",
          description:
            "Planına göre ödeme periyodu değişir; detaylar fiyatlandırma sayfasında açıklanır.",
        },
        {
          title: "İade politikanız nedir?",
          description:
            "Kurs ödemeleri için belirli bir süre içinde iade talebi oluşturabilirsin.",
        },
        {
          title: "Canlı yayın nasıl açılır?",
          description:
            "Yönetim paneli üzerinden canlı yayın oturumu oluşturup tek tuşla yayına geçebilirsin.",
        },
      ]}
    />
  );
}
