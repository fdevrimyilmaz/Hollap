import type { Metadata } from "next";
import { InfoPage } from "@/components/page/InfoPage";

export const metadata: Metadata = {
  title: "Yaratıcı Ol",
  description:
    "Bilgini ürüne çevir, takipçini gelire dönüştür. Yaratıcı paneliyle içerik yayınla, abonelik katmanları kur.",
};

export default function BecomeCreatorPage() {
  return (
    <InfoPage
      badge="Yaratıcı Programı"
      title="Bilgini ürüne çevir, takipçini gelire dönüştür"
      description="Yaratıcı paneliyle içeriklerini yayınla, abonelik katmanları oluştur ve topluluğunla doğrudan etkileşim kur."
      primaryCta={{ label: "Hemen Kayıt Ol", href: "/signup" }}
      secondaryCta={{ label: "Nasıl Çalışır", href: "/how-it-works" }}
      sections={[
        {
          title: "Hızlı Başlangıç",
          description: "Dakikalar içinde profilini tamamlayıp ilk içeriğini yayınlayabilirsin.",
          points: ["Profil ve marka tasarımı", "Kategori seçimi", "İlk kurs kurulumu"],
        },
        {
          title: "Gelir Modelleri",
          description: "Tek tip modele bağlı kalmadan farklı ürünlerle gelirini çeşitlendir.",
          points: ["Kurs satışı", "Üyelik paketleri", "PPV ve DM satışı"],
        },
        {
          title: "Topluluk ve Sadakat",
          description: "Abonelerine dosya, canlı yayın ve özel içerik sunarak bağlılığı artır.",
          points: ["Aboneye özel içerik", "Canlı yayın", "Bildirim ve duyuru"],
        },
        {
          title: "Operasyon",
          description: "Ödeme ve içerik operasyonunu merkezi panelden yönetebilirsin.",
          points: ["Yönetim paneli", "Dosya dağıtımı", "Sipariş ve ürün yönetimi"],
        },
      ]}
    />
  );
}
