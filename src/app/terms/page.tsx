import { InfoPage } from "@/components/page/InfoPage";

export default function TermsPage() {
  return (
    <InfoPage
      badge="Kullanim Sartlari"
      title="Platform kullanimina dair temel kurallar"
      description="Hollap kullanirken taraflarin hak ve sorumluluklarini belirleyen temel prensipler bu sayfada ozetlenir."
      secondaryCta={{ label: "Gizlilik Politikasi", href: "/privacy" }}
      sections={[
        {
          title: "Hesap Sorumlulugu",
          description: "Hesap guvenligi ve erisim bilgilerinin korunmasi kullanicinin sorumlulugundadir.",
        },
        {
          title: "Icerik Kurallari",
          description: "Yasalara aykiri, telif ihlali iceren veya zarar verici icerikler platformda yayinlanamaz.",
        },
        {
          title: "Odeme ve Iade",
          description: "Satis ve iade akislarinda platform kurallari ve ilgili mevzuat esas alinir.",
        },
        {
          title: "Hizmet Degisiklikleri",
          description: "Platform ozellikleri, guvenlik veya operasyonel gerekcelerle zaman icinde guncellenebilir.",
        },
      ]}
    />
  );
}
