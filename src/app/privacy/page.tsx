import type { Metadata } from "next";
import { InfoPage } from "@/components/page/InfoPage";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Hollap'ın kişisel verilerinizi nasıl topladığı, işlediği, sakladığı ve haklarınızı kullanabileceğiniz yöntemler.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      badge="Gizlilik Politikası"
      title="Kişisel verilerinizin korunması ve işlenmesi"
      description="Bu politika; Hollap hizmetleri kapsamında hangi verileri hangi hukuki dayanaklarla işlediğimizi, ne kadar süre sakladığımızı ve haklarınızı nasıl kullanabileceğinizi açıklar."
      primaryCta={{ label: "İletişime Geç", href: "/contact" }}
      secondaryCta={{ label: "Kullanım Şartları", href: "/terms" }}
      sections={[
        {
          title: "Kapsam ve Veri Sorumlusu",
          description:
            "Bu politika; web sitesi, mobil uyumlu ekranlar, API servisleri ve destek kanalları dahil olmak üzere Hollap tarafından sunulan tüm hizmetleri kapsar.",
          points: [
            "Veri sorumlusu: Hollap platform işletmecisi.",
            "Politika; ziyaretçi, üye, yaratıcı ve alıcı profillerine uygulanır.",
            "Yürürlük tarihi: 13 Şubat 2026.",
          ],
        },
        {
          title: "Toplanan Veri Kategorileri",
          description:
            "Hizmetin niteliğine göre yalnızca gerekli veriler toplanır ve asgari veri ilkesi uygulanır.",
          points: [
            "Kimlik ve hesap verileri: ad soyad, e-posta, şifre hash bilgisi, rol bilgisi.",
            "İşlem verileri: ürün, sipariş, abonelik, ödeme referansı ve iade kayıtları.",
            "Teknik veriler: IP, cihaz/tarayıcı bilgileri, oturum kayıtları, güvenlik logları.",
            "İletişim verileri: destek talepleri, geri bildirimler ve bildirim tercihleri.",
          ],
        },
        {
          title: "İşleme Amaçları",
          description: "Veriler; hizmetin kurulması, sunulması ve güvenli şekilde sürdürülmesi için işlenir.",
          points: [
            "Hesap oluşturma, kimlik doğrulama ve yetkilendirme süreçlerini yürütmek.",
            "Ödeme, faturalama, abonelik ve teslimat operasyonlarını tamamlamak.",
            "Dolandırıcılık, yetkisiz erişim ve kötüye kullanım risklerini azaltmak.",
            "Ürün ve hizmet performansını izlemek, hataları gidermek ve platformu geliştirmek.",
          ],
        },
        {
          title: "Hukuki Dayanaklar",
          description: "Kişisel veri işleme faaliyetleri ilgili mevzuata uygun hukuki sebeplere dayanır.",
          points: [
            "Sözleşmenin kurulması ve ifası için zorunlu işlemler.",
            "Yasal yükümlülüklerin yerine getirilmesi (muhasebe, denetim, kayıt tutma).",
            "Meşru menfaat kapsamında güvenlik, kalite ve operasyon sürekliliği işlemleri.",
            "Gerektiğinde açık rıza (örneğin pazarlama iletişim tercihleri).",
          ],
        },
        {
          title: "Veri Paylaşımı ve Aktarım",
          description: "Veriler; hizmeti sunmak için zorunlu olan sınırlı alıcılarla paylaşılır, gereksiz aktarım yapılmaz.",
          points: [
            "Ödeme hizmet sağlayıcıları (ödeme işlemleri ve sahtecilik kontrolleri).",
            "Altyapı sağlayıcıları (barındırma, depolama, bildirim ve e-posta servisleri).",
            "Hukuki zorunluluk halinde yetkili kamu kurumları ve yargı mercileri.",
            "Tüm aktarımlarda gizlilik ve veri işleme yükümlülükleri sözleşmelerle korunur.",
          ],
        },
        {
          title: "Saklama Süreleri",
          description: "Veriler; yalnızca işleme amacı için gerekli süre boyunca veya mevzuatın zorunlu kıldığı süre kadar saklanır.",
          points: [
            "Hesap ve oturum kayıtları: hesap aktifliği ve güvenlik ihtiyacına göre.",
            "Finansal ve işlemsel kayıtlar: ilgili vergi ve muhasebe mevzuatı sürelerince.",
            "Destek ve güvenlik logları: denetim, uyuşmazlık ve güvenlik ihtiyacına göre.",
            "Süre sonunda veriler silinir, anonimleştirilir veya mevzuata uygun imha edilir.",
          ],
        },
        {
          title: "Veri Güvenliği",
          description: "Teknik ve idari tedbirler; verilerin gizliliği, bütünlüğü ve erişilebilirliğini korumak için uygulanır.",
          points: [
            "Rol tabanlı erişim kontrolü ve oturum güvenliği mekanizmaları.",
            "Şifrelerin tek yönlü hash algoritmaları ile saklanması.",
            "Yetkisiz işlem, kötüye kullanım ve anomali tespiti için loglama ve izleme.",
            "Güncel güvenlik yamaları, yedekleme ve olay yönetimi süreçleri.",
          ],
        },
        {
          title: "Haklarınız ve Başvuru",
          description: "Mevzuatın tanıdığı haklar kapsamında verilerinize ilişkin talepte bulunabilirsiniz.",
          points: [
            "Veriye erişim, düzeltme, silme ve işlemeyi kısıtlama talepleri.",
            "Belirli işlemlere itiraz ve uygun olduğunda veri taşınabilirliği talepleri.",
            "Açık rıza gerektiren işlemlerde rızanın geri alınması hakkı.",
            "Başvuru için: support@hollap.com üzerinden kimlik doğrulamalı talep iletebilirsiniz.",
          ],
        },
        {
          title: "Politika Güncellemeleri",
          description: "Bu politika; mevzuat değişiklikleri veya hizmet gelişimine bağlı olarak güncellenebilir.",
          points: [
            "Önemli değişiklikler yürürlük tarihleriyle birlikte bu sayfada ilan edilir.",
            "Güncel sürümün takibi kullanıcının sorumluluğundadır.",
          ],
        },
      ]}
    />
  );
}
