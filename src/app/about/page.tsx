import { InfoPage } from "@/components/page/InfoPage";

export default function AboutPage() {
  return (
    <InfoPage
      badge="Hakkimizda"
      title="Creator ekonomisi icin uretilmis platform"
      description="Hollap, yaraticilarin kurs, ozel icerik ve canli yayinla gelir elde etmesini; ogrencilerin ise kaliteli bilgiye hizli ulasmasini saglar."
      primaryCta={{ label: "Kesfet", href: "/explore" }}
      secondaryCta={{ label: "Yaratici Ol", href: "/become-creator" }}
      sections={[
        {
          title: "Misyon",
          description: "Bilgiyi daha erisilebilir hale getirirken yaraticilara surdurulebilir gelir modeli sunuyoruz.",
          points: [
            "Dijital urun ve kurs satisi",
            "Abonelik ve topluluk odakli buyume",
            "Yaratici ve ogrenci deneyimine odak",
          ],
        },
        {
          title: "Neden Hollap",
          description: "Tek panelden icerik yonetimi, odeme altyapisi ve topluluk etkilesimi.",
          points: [
            "Hizli kurulum",
            "Guvenli odeme akisi",
            "Canli yayin ve bildirim altyapisi",
          ],
        },
      ]}
    />
  );
}
