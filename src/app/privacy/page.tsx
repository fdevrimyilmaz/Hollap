import { InfoPage } from "@/components/page/InfoPage";

export default function PrivacyPage() {
  return (
    <InfoPage
      badge="Gizlilik Politikasi"
      title="Kisisel verilerinizin korunmasi ve islenmesi"
      description="Bu politika, Hollap hizmetleri kapsaminda hangi verileri hangi hukuki dayanaklarla isledigimizi, ne kadar sure sakladigimizi ve haklarinizi nasil kullanabileceginizi aciklar."
      primaryCta={{ label: "Iletisime Gec", href: "/contact" }}
      secondaryCta={{ label: "Kullanim Sartlari", href: "/terms" }}
      sections={[
        {
          title: "Kapsam ve Veri Sorumlusu",
          description: "Bu politika, web sitesi, mobil uyumlu ekranlar, API servisleri ve destek kanallari dahil olmak uzere Hollap tarafindan sunulan tum hizmetleri kapsar.",
          points: [
            "Veri sorumlusu: Hollap platform isletmecisi.",
            "Politika; ziyaretci, uye, yaratici ve alici profillerine uygulanir.",
            "Yururluk tarihi: 13 Subat 2026.",
          ],
        },
        {
          title: "Toplanan Veri Kategorileri",
          description: "Hizmetin niteligine gore yalnizca gerekli veriler toplanir ve asgari veri ilkesi uygulanir.",
          points: [
            "Kimlik ve hesap verileri: ad soyad, e-posta, sifre hash bilgisi, rol bilgisi.",
            "Islem verileri: urun, siparis, abonelik, odeme referansi ve iade kayitlari.",
            "Teknik veriler: IP, cihaz/tarayici bilgileri, oturum kayitlari, guvenlik loglari.",
            "Iletisim verileri: destek talepleri, geri bildirimler ve bildirim tercihleri.",
          ],
        },
        {
          title: "Isleme Amaclari",
          description: "Veriler, hizmetin kurulmasi, sunulmasi ve guvenli sekilde surdurulmesi icin islenir.",
          points: [
            "Hesap olusturma, kimlik dogrulama ve yetkilendirme sureclerini yurutmek.",
            "Odeme, faturalama, abonelik ve teslimat operasyonlarini tamamlamak.",
            "Dolandiricilik, yetkisiz erisim ve kotuye kullanim risklerini azaltmak.",
            "Urun ve hizmet performansini izlemek, hatalari gidermek ve platformu gelistirmek.",
          ],
        },
        {
          title: "Hukuki Dayanaklar",
          description: "Kisisel veri isleme faaliyetleri ilgili mevzuata uygun hukuki sebeplere dayanir.",
          points: [
            "Sozlesmenin kurulmasi ve ifasi icin zorunlu islemler.",
            "Yasal yukumluluklerin yerine getirilmesi (muhasebe, denetim, kayit tutma).",
            "Mesru menfaat kapsaminda guvenlik, kalite ve operasyon surekliligi islemleri.",
            "Gerektiginde acik riza (ornegin pazarlama iletisim tercihleri).",
          ],
        },
        {
          title: "Veri Paylasimi ve Aktarim",
          description: "Veriler, hizmeti sunmak icin zorunlu olan sinirli alicilarla paylasilir; gereksiz aktarim yapilmaz.",
          points: [
            "Odeme hizmet saglayicilari (odeme islemleri ve sahtecilik kontrolleri).",
            "Altyapi saglayicilari (barindirma, depolama, bildirim ve e-posta servisleri).",
            "Hukuki zorunluluk halinde yetkili kamu kurumlari ve yargi mercileri.",
            "Tum aktarimlarda gizlilik ve veri isleme yukumlulukleri sozlesmelerle korunur.",
          ],
        },
        {
          title: "Saklama Sureleri",
          description: "Veriler, yalnizca isleme amaci icin gerekli sure boyunca veya mevzuatin zorunlu kildigi sure kadar saklanir.",
          points: [
            "Hesap ve oturum kayitlari: hesap aktifligi ve guvenlik ihtiyacina gore.",
            "Finansal ve islemsel kayitlar: ilgili vergi ve muhasebe mevzuati surelerince.",
            "Destek ve guvenlik loglari: denetim, uyusmazlik ve guvenlik ihtiyacina gore.",
            "Sure sonunda veriler silinir, anonimlestirilir veya mevzuata uygun imha edilir.",
          ],
        },
        {
          title: "Veri Guvenligi",
          description: "Teknik ve idari tedbirler, verilerin gizliligi, butunlugu ve erisilebilirligini korumak icin uygulanir.",
          points: [
            "Rol tabanli erisim kontrolu ve oturum guvenligi mekanizmalari.",
            "Sifrelerin tek yonlu hash algoritmalari ile saklanmasi.",
            "Yetkisiz islem, kotuye kullanim ve anomali tespiti icin loglama ve izleme.",
            "Guncel guvenlik yamalari, yedekleme ve olay yonetimi surecleri.",
          ],
        },
        {
          title: "Haklariniz ve Basvuru",
          description: "Mevzuatin tanidigi haklar kapsaminda verilerinize iliskin talepte bulunabilirsiniz.",
          points: [
            "Veriye erisim, duzeltme, silme ve islemeyi kisitlama talepleri.",
            "Belirli islemlere itiraz ve uygun oldugunda veri tasinabilirligi talepleri.",
            "Acik riza gerektiren islemlerde rizanin geri alinmasi hakki.",
            "Basvuru icin: support@hollap.com uzerinden kimlik dogrulamali talep iletebilirsiniz.",
          ],
        },
        {
          title: "Politika Guncellemeleri",
          description: "Bu politika, mevzuat degisiklikleri veya hizmet gelisimine bagli olarak guncellenebilir.",
          points: [
            "Onemli degisiklikler yururluk tarihleriyle birlikte bu sayfada ilan edilir.",
            "Guncel surumun takibi kullanicinin sorumlulugundadir.",
          ],
        },
      ]}
    />
  );
}
