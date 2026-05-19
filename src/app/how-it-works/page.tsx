import type { Metadata } from "next";
import { InfoPage } from "@/components/page/InfoPage";

export const metadata: Metadata = {
  title: "Nasıl Çalışır",
  description:
    "3 adımda yayınla, büyü, gelir elde et. İçeriğini oluştur, topluluğunu kur, ödemelerini güvenle al.",
};

export default function HowItWorksPage() {
  return (
    <InfoPage
      badge="Nasıl Çalışır"
      title="3 adımda yayınla, büyü, gelir elde et"
      description="İçeriğini oluştur, topluluğunu kur, ödemelerini güvenle al. Tüm süreç tek platformda yönetilir."
      primaryCta={{ label: "Yaratıcı Hesabı Aç", href: "/signup" }}
      secondaryCta={{ label: "Fiyatlandırmayı Gör", href: "/pricing" }}
      sections={[
        {
          title: "İçerik Oluştur",
          description: "Video, doküman ve canlı yayın içeriklerini panelden kolayca yükle.",
          points: ["Kurs modülleri", "Özel dosya paylaşımı", "Takvimli yayın"],
        },
        {
          title: "Topluluğunu Büyüt",
          description: "Profil, bildirim ve sosyal kanallarla takipçi tabanını güçlendir.",
          points: ["Takipçi bildirimleri", "DM satış akışı", "Topluluk etkileşimi"],
        },
        {
          title: "Gelirini Artır",
          description: "Kurs satışı, abonelik ve PPV modelleriyle birden fazla gelir kanalı oluştur.",
          points: ["Kurs ödemeleri", "Aylık abonelik", "İleri seviye ürünler"],
        },
        {
          title: "Performansı İzle",
          description: "Panel ile satış, izlenme ve üyelik trendlerini anlık takip et.",
          points: ["Gerçek zamanlı metrikler", "Ürün performansı", "Gelir raporu"],
        },
      ]}
    />
  );
}
