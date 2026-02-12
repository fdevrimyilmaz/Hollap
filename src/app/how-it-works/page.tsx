import { InfoPage } from "@/components/page/InfoPage";

export default function HowItWorksPage() {
  return (
    <InfoPage
      badge="Nasil Calisir"
      title="3 adimda yayinla, buyu, gelir elde et"
      description="Icerigini olustur, toplulugunu kur, odemelerini guvenle al. Tum surec tek platformda yonetilir."
      primaryCta={{ label: "Yaratici Hesabi Ac", href: "/signup" }}
      secondaryCta={{ label: "Fiyatlandirmayi Gor", href: "/pricing" }}
      sections={[
        {
          title: "1. Icerik Olustur",
          description: "Video, dokuman ve canli yayin iceriklerini panelden kolayca yukle.",
          points: ["Kurs modulleri", "Ozel dosya paylasimi", "Takvimli yayin"],
        },
        {
          title: "2. Toplulugunu Buyut",
          description: "Profil, bildirim ve sosyal kanallarla takipci tabanini guclendir.",
          points: ["Takipci bildirimleri", "DM satis akisi", "Topluluk etkilesimi"],
        },
        {
          title: "3. Gelirini Artir",
          description: "Kurs satisi, abonelik ve PPV modelleriyle birden fazla gelir kanali olustur.",
          points: ["Kurs odemeleri", "Aylik abonelik", "Ileri seviye urunler"],
        },
        {
          title: "Performansi Izle",
          description: "Dashboard ile satis, izlenme ve uyelik trendlerini anlik takip et.",
          points: ["Gercek zamanli metrikler", "Urun performansi", "Gelir raporu"],
        },
      ]}
    />
  );
}
