import { InfoPage } from "@/components/page/InfoPage";

export default function AboutPage() {
  return (
    <InfoPage
      badge="Hakkimizda"
      title="Yaratici ekonomisi icin guvenilir ve olceklenebilir platform"
      description="Hollap, uzmanlik bilgisini dijital urune donusturen yaraticilar ile nitelikli icerik arayan ogrencileri ayni ekosistemde bulusturur. Hedefimiz, gelir ureten egitim modellerini sade, guvenli ve olceklenebilir bir altyapiyla desteklemektir."
      primaryCta={{ label: "Platformu Kesfet", href: "/explore" }}
      secondaryCta={{ label: "Yaratici Basvurusu", href: "/become-creator" }}
      sections={[
        {
          title: "Misyonumuz",
          description: "Yaraticilarin bilgi ve deneyimlerini surdurulebilir bir gelir modeline donustururken, ogrenciler icin olculebilir ve kaliteli ogrenme deneyimi sunuyoruz.",
          points: [
            "Kurs, abonelik ve canli yayin modellerini tek merkezden yonetme",
            "Kullanim kolayligi yuksek, veri odakli panel deneyimi",
            "Guvenli odeme akislari ve yasal uyumluluk odagi",
          ],
        },
        {
          title: "Vizyonumuz",
          description: "Turkiye ve global pazarda yaraticilarin ilk tercihi olan topluluk ve egitim platformu olmayi hedefliyoruz.",
          points: [
            "Yerel ihtiyaclara uyumlu, esnek gelir modelleri",
            "Olceklenebilir altyapi ile kesintisiz deneyim",
            "Yaratici-ogrenci etkilesimini guclendiren urun yaklasimi",
          ],
        },
        {
          title: "Calisma Ilkelerimiz",
          description: "Urun gelistirme sureclerinde kalite, seffaflik ve sureklilik ilkelerini esas aliyoruz.",
          points: [
            "Kullanici geri bildirimleriyle surekli iyilestirme",
            "Veri guvenligi ve gizlilikte yuksek standartlar",
            "Uzun vadeli is ortakliklarini onceliklendirme",
          ],
        },
        {
          title: "Neden Hollap",
          description: "Yaraticilarin buyumesine odaklanan butunlesik urun seti ile operasyonel yukleri azaltir, odagi icerik uretime tasiriz.",
          points: [
            "Dakikalar icinde yayin ve satisa baslama",
            "Odeme, icerik ve topluluk yonetimi tek panelde",
            "Performans takibi icin analitik raporlama",
          ],
        },
      ]}
    />
  );
}
