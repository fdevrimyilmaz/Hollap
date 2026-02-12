import { InfoPage } from "@/components/page/InfoPage";

export default function CommunityPage() {
  return (
    <InfoPage
      badge="Topluluk"
      title="Ureten ve ogrenen insanlarin bulusma noktasi"
      description="Yaraticilar, ogrenciler ve ekip arasindaki etkilesimi guclendiren topluluk alanlarini tek sayfada topladik."
      primaryCta={{ label: "Yaraticilari Kesfet", href: "/creators" }}
      secondaryCta={{ label: "Yeni Icerikler", href: "/new" }}
      sections={[
        {
          title: "Yaratici Sohbetleri",
          description: "Alaninda uzman yaraticilarin deneyim paylastigi etkilesimli oturumlar.",
          points: ["Haftalik canli bulusma", "Soru-cevap", "Uygulamali anlatim"],
        },
        {
          title: "Ogrenci Agi",
          description: "Kurs katilimcilariyla proje ve geri bildirim odakli bir ag kur.",
          points: ["Proje paylasimi", "Geri bildirim dongusu", "Eslesmeli calisma"],
        },
        {
          title: "Duyuru Akisi",
          description: "Yeni icerik, etkinlik ve onemli guncellemeleri takip et.",
          points: ["Platform duyurulari", "Etkinlik takvimi", "Kampanya haberleri"],
        },
        {
          title: "Katki",
          description: "Topluluga katkida bulunmak icin geri bildirim ve oneri kanallarini kullan.",
          points: ["Ozellik onerileri", "Beta test katilimi", "Ortaklik talepleri"],
        },
      ]}
    />
  );
}
