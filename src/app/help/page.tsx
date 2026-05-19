import type { Metadata } from "next";
import { InfoPage } from "@/components/page/InfoPage";

export const metadata: Metadata = {
  title: "Yardım Merkezi",
  description:
    "Hesap, ödeme, içerik yönetimi ve teknik konularda yardım alabileceğin temel kaynaklar.",
};

export default function HelpPage() {
  return (
    <InfoPage
      badge="Yardım Merkezi"
      title="İhtiyacın olduğunda hızlı destek"
      description="Hesap, ödeme, içerik yönetimi ve teknik konularda yardım alabileceğin temel kaynakları bir araya getirdik."
      primaryCta={{ label: "SSS Sayfası", href: "/faq" }}
      secondaryCta={{ label: "İletişime Geç", href: "/contact" }}
      sections={[
        {
          title: "Hesap ve Giriş",
          description: "Giriş, şifre sıfırlama ve hesap güvenliği konularında adım adım yardım.",
          points: ["Şifre yenileme", "Oturum yönetimi", "Güvenlik önerileri"],
        },
        {
          title: "Ödeme ve Faturalama",
          description: "Satış, iade ve ödeme akışlarında en çok sorulan konular.",
          points: ["Ödeme sorunları", "İade talepleri", "Ödeme durumu"],
        },
        {
          title: "Yaratıcı Paneli",
          description: "Kurs yayınlama, dosya gönderimi ve ürün yönetimi yardım başlıkları.",
          points: ["İçerik ekleme", "Ürün aktifleştirme", "Canlı yayın"],
        },
        {
          title: "Topluluk",
          description: "Diğer yaratıcılar ve öğrencilerle bağlantı kurmak için topluluk kanalları.",
          points: ["Topluluk duyuruları", "Geri bildirim", "Ortaklık fırsatları"],
        },
      ]}
    />
  );
}
