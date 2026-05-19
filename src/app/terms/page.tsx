import type { Metadata } from "next";
import { InfoPage } from "@/components/page/InfoPage";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "Hollap platformunu kullanırken tarafların hak ve sorumluluklarını belirleyen temel prensipler.",
};

export default function TermsPage() {
  return (
    <InfoPage
      badge="Kullanım Şartları"
      title="Platform kullanımına dair temel kurallar"
      description="Hollap'ı kullanırken tarafların hak ve sorumluluklarını belirleyen temel prensipler bu sayfada özetlenir."
      secondaryCta={{ label: "Gizlilik Politikası", href: "/privacy" }}
      sections={[
        {
          title: "Hesap Sorumluluğu",
          description: "Hesap güvenliği ve erişim bilgilerinin korunması kullanıcının sorumluluğundadır.",
        },
        {
          title: "İçerik Kuralları",
          description: "Yasalara aykırı, telif ihlali içeren veya zarar verici içerikler platformda yayınlanamaz.",
        },
        {
          title: "Ödeme ve İade",
          description: "Satış ve iade akışlarında platform kuralları ve ilgili mevzuat esas alınır.",
        },
        {
          title: "Hizmet Değişiklikleri",
          description: "Platform özellikleri; güvenlik veya operasyonel gerekçelerle zaman içinde güncellenebilir.",
        },
      ]}
    />
  );
}
