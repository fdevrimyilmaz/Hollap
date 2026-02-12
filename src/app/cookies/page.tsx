import { InfoPage } from "@/components/page/InfoPage";

export default function CookiesPage() {
  return (
    <InfoPage
      badge="Cerez Politikasi"
      title="Cerez kullanimi hakkinda bilgilendirme"
      description="Daha iyi deneyim, guvenlik ve performans icin cerezlerden yararlaniyoruz."
      secondaryCta={{ label: "Gizlilik Politikasi", href: "/privacy" }}
      sections={[
        {
          title: "Zorunlu Cerezler",
          description: "Oturum, guvenlik ve temel platform islevleri icin kullanilir.",
        },
        {
          title: "Analitik Cerezler",
          description: "Sayfa performansi ve kullanim trendlerini analiz etmek icin kullanilir.",
        },
        {
          title: "Tercih Cerezleri",
          description: "Dil, gorunum ve benzeri kullanici tercihlerini hatirlamaya yardimci olur.",
        },
        {
          title: "Yonetim",
          description: "Tarayici ayarlarindan cerezleri silebilir veya kisitlayabilirsin.",
        },
      ]}
    />
  );
}
