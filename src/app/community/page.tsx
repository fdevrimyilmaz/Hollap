import type { Metadata } from "next";
import { InfoPage } from "@/components/page/InfoPage";

export const metadata: Metadata = {
  title: "Topluluk",
  description: "Üreten ve öğrenen insanların buluşma noktası. Yaratıcılar, öğrenciler ve ekip arasındaki etkileşim alanları.",
};

export default function CommunityPage() {
  return (
    <InfoPage
      badge="Topluluk"
      title="Üreten ve öğrenen insanların buluşma noktası"
      description="Yaratıcılar, öğrenciler ve ekip arasındaki etkileşimi güçlendiren topluluk alanlarını tek sayfada topladık."
      primaryCta={{ label: "Yaratıcıları Keşfet", href: "/creators" }}
      secondaryCta={{ label: "Yeni İçerikler", href: "/new" }}
      sections={[
        {
          title: "Yaratıcı Sohbetleri",
          description: "Alanında uzman yaratıcıların deneyim paylaştığı etkileşimli oturumlar.",
          points: ["Haftalık canlı buluşma", "Soru–cevap", "Uygulamalı anlatım"],
        },
        {
          title: "Öğrenci Ağı",
          description: "Kurs katılımcılarıyla proje ve geri bildirim odaklı bir ağ kur.",
          points: ["Proje paylaşımı", "Geri bildirim döngüsü", "Eşleşmeli çalışma"],
        },
        {
          title: "Duyuru Akışı",
          description: "Yeni içerik, etkinlik ve önemli güncellemeleri takip et.",
          points: ["Platform duyuruları", "Etkinlik takvimi", "Kampanya haberleri"],
        },
        {
          title: "Katkı",
          description: "Topluluğa katkıda bulunmak için geri bildirim ve öneri kanallarını kullan.",
          points: ["Özellik önerileri", "Beta test katılımı", "Ortaklık talepleri"],
        },
      ]}
    />
  );
}
