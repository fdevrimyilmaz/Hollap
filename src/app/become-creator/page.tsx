import { InfoPage } from "@/components/page/InfoPage";

export default function BecomeCreatorPage() {
  return (
    <InfoPage
      badge="Yaratici Programi"
      title="Bilgini urune cevir, takipcini gelire donustur"
      description="Yaratici paneliyle iceriklerini yayinla, abonelik katmanlari olustur ve toplulugunla dogrudan etkilesim kur."
      primaryCta={{ label: "Hemen Kayit Ol", href: "/signup" }}
      secondaryCta={{ label: "Nasil Calisir", href: "/how-it-works" }}
      sections={[
        {
          title: "Hizli Baslangic",
          description: "Dakikalar icinde profilini tamamlayip ilk icerigini yayinlayabilirsin.",
          points: ["Profil ve branding", "Kategori secimi", "Ilk kurs kurulumu"],
        },
        {
          title: "Gelir Modelleri",
          description: "Tek tip modele bagli kalmadan farkli urunlerle gelirini cesitlendir.",
          points: ["Kurs satisi", "Uyelik paketleri", "PPV ve DM satis"],
        },
        {
          title: "Topluluk ve Sadakat",
          description: "Abonelerine dosya, canli yayin ve ozel icerik sunarak bagliligi artir.",
          points: ["Subscriber-only icerik", "Canli yayin", "Bildirim ve duyuru"],
        },
        {
          title: "Operasyon",
          description: "Odeme ve icerik operasyonunu merkezi panelden yonetebilirsin.",
          points: ["Dashboard", "Dosya dagitimi", "Siparis ve urun yonetimi"],
        },
      ]}
    />
  );
}
