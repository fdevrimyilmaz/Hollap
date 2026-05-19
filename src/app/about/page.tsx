import type { Metadata } from "next";
import { InfoPage } from "@/components/page/InfoPage";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "Hollap; yaratıcı ekonomisi için güvenilir, ölçeklenebilir ve modern bir platform. Misyonumuz, vizyonumuz ve değerlerimiz hakkında daha fazlasını öğrenin.",
};

export default function AboutPage() {
  return (
    <InfoPage
      badge="Hakkımızda"
      title="Yaratıcı ekonomisi için güvenilir ve ölçeklenebilir platform"
      description="Hollap, uzmanlık bilgisini dijital ürüne dönüştüren yaratıcılar ile nitelikli içerik arayan öğrencileri aynı ekosistemde buluşturur. Hedefimiz; gelir üreten eğitim modellerini sade, güvenli ve ölçeklenebilir bir altyapıyla desteklemektir."
      primaryCta={{ label: "Platformu Keşfet", href: "/explore" }}
      secondaryCta={{ label: "Yaratıcı Başvurusu", href: "/become-creator" }}
      sections={[
        {
          title: "Misyonumuz",
          description:
            "Yaratıcıların bilgi ve deneyimlerini sürdürülebilir bir gelir modeline dönüştürürken, öğrenciler için ölçülebilir ve kaliteli bir öğrenme deneyimi sunuyoruz.",
          points: [
            "Kurs, abonelik ve canlı yayın modellerini tek merkezden yönetme",
            "Kullanım kolaylığı yüksek, veri odaklı panel deneyimi",
            "Güvenli ödeme akışları ve yasal uyumluluk odağı",
          ],
        },
        {
          title: "Vizyonumuz",
          description:
            "Türkiye ve global pazarda yaratıcıların ilk tercihi olan topluluk ve eğitim platformu olmayı hedefliyoruz.",
          points: [
            "Yerel ihtiyaçlara uyumlu, esnek gelir modelleri",
            "Ölçeklenebilir altyapı ile kesintisiz deneyim",
            "Yaratıcı–öğrenci etkileşimini güçlendiren ürün yaklaşımı",
          ],
        },
        {
          title: "Çalışma İlkelerimiz",
          description:
            "Ürün geliştirme süreçlerinde kalite, şeffaflık ve süreklilik ilkelerini esas alıyoruz.",
          points: [
            "Kullanıcı geri bildirimleriyle sürekli iyileştirme",
            "Veri güvenliği ve gizlilikte yüksek standartlar",
            "Uzun vadeli iş ortaklıklarını önceliklendirme",
          ],
        },
        {
          title: "Neden Hollap?",
          description:
            "Yaratıcıların büyümesine odaklanan bütünleşik ürün seti ile operasyonel yükleri azaltır, odağı içerik üretimine taşırız.",
          points: [
            "Dakikalar içinde yayına ve satışa başlama",
            "Ödeme, içerik ve topluluk yönetimi tek panelde",
            "Performans takibi için analitik raporlama",
          ],
        },
      ]}
    />
  );
}
