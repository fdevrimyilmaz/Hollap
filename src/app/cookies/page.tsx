import type { Metadata } from "next";
import { InfoPage } from "@/components/page/InfoPage";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "Daha iyi deneyim, güvenlik ve performans için kullandığımız çerezler hakkında detaylı bilgi.",
};

export default function CookiesPage() {
  return (
    <InfoPage
      badge="Çerez Politikası"
      title="Çerez kullanımı hakkında bilgilendirme"
      description="Daha iyi deneyim, güvenlik ve performans için çerezlerden yararlanıyoruz. Aşağıda hangi çerezi neden kullandığımızı açıkladık."
      secondaryCta={{ label: "Gizlilik Politikası", href: "/privacy" }}
      sections={[
        {
          title: "Zorunlu Çerezler",
          description: "Oturum, güvenlik ve temel platform işlevleri için kullanılır.",
        },
        {
          title: "Analitik Çerezler",
          description: "Sayfa performansı ve kullanım trendlerini analiz etmek için kullanılır.",
        },
        {
          title: "Tercih Çerezleri",
          description: "Dil, görünüm ve benzeri kullanıcı tercihlerini hatırlamaya yardımcı olur.",
        },
        {
          title: "Yönetim",
          description: "Tarayıcı ayarlarından çerezleri silebilir veya kısıtlayabilirsin.",
        },
      ]}
    />
  );
}
