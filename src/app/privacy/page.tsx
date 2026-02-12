import { InfoPage } from "@/components/page/InfoPage";

export default function PrivacyPage() {
  return (
    <InfoPage
      badge="Gizlilik Politikasi"
      title="Verilerini nasil isledigimizi acikca anlatiyoruz"
      description="Kisisel verilerin korunmasi bizim icin onceliklidir. Bu sayfa, hangi verileri ne amacla kullandigimizi ozetler."
      secondaryCta={{ label: "Kullanim Sartlari", href: "/terms" }}
      sections={[
        {
          title: "Toplanan Veriler",
          description: "Hesap bilgileri, odeme islemleri ve platform kullanimi icin gereken temel teknik veriler toplanir.",
        },
        {
          title: "Kullanim Amaci",
          description: "Hizmet saglama, guvenlik, odeme dogrulama ve urun gelistirme amaclariyla islenir.",
        },
        {
          title: "Paylasim",
          description: "Yasal zorunluluk olmadikca veriler izinsiz ucuncu taraflarla paylasilmaz.",
        },
        {
          title: "Haklarin",
          description: "Verine erisim, duzeltme veya silme taleplerin icin destek ekibimizle iletisime gecebilirsin.",
        },
      ]}
    />
  );
}
