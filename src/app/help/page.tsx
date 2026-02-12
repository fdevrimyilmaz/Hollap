import { InfoPage } from "@/components/page/InfoPage";

export default function HelpPage() {
  return (
    <InfoPage
      badge="Yardim Merkezi"
      title="Ihtiyacin oldugunda hizli destek"
      description="Hesap, odeme, icerik yonetimi ve teknik konularda yardim alabilecegin temel kaynaklar burada."
      primaryCta={{ label: "SSS Sayfasi", href: "/faq" }}
      secondaryCta={{ label: "Iletisime Gec", href: "/contact" }}
      sections={[
        {
          title: "Hesap ve Giris",
          description: "Giris, sifre sifirlama ve hesap guvenligi konularinda adim adim yardim.",
          points: ["Sifre yenileme", "Oturum yonetimi", "Guvenlik onerileri"],
        },
        {
          title: "Odeme ve Faturalama",
          description: "Satis, iade ve odeme akislarinda en cok sorulan konular.",
          points: ["Checkout sorunlari", "Iade talepleri", "Odeme durumu"],
        },
        {
          title: "Yaratici Paneli",
          description: "Kurs yayinlama, dosya gonderimi ve urun yonetimi yardim basliklari.",
          points: ["Icerik ekleme", "Urun aktiflestirme", "Canli yayin"],
        },
        {
          title: "Topluluk",
          description: "Diger yaraticilar ve ogrencilerle baglanti kurmak icin topluluk kanallari.",
          points: ["Topluluk duyurulari", "Geri bildirim", "Ortaklik firsatlari"],
        },
      ]}
    />
  );
}
