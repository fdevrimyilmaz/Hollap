#!/usr/bin/env node
// Demo data seeder — Hollap için örnek yaratıcılar + ürünler ekler.
// Kullanim:  npm run db:seed
//
// - Mevcut e-postalar tekrar eklenmez (idempotent).
// - Her demo yaratıcının şifresi "Demo1234!" — sadece yerel test içindir.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

function parseDotEnv(content) {
  const parsed = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf("=");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

for (const candidate of [".env.local", ".env"]) {
  const filePath = path.resolve(candidate);
  if (!existsSync(filePath)) continue;
  const parsed = parseDotEnv(readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]?.trim()) process.env[key] = value;
  }
  break;
}

const DEMO_PASSWORD = "Demo1234!";

const creators = [
  {
    name: "Ayşe Kara",
    email: "ayse@hollap.demo",
    products: [
      {
        name: "İleri Düzey React & Next.js 15",
        priceCents: 4900,
        stock: 100,
        sold: 42,
        lessons: [
          { title: "Kursa giriş ve ortam kurulumu", duration: "6:42", isPreview: true },
          { title: "Next.js 15 App Router mimarisi", duration: "18:25" },
          { title: "Server vs. Client Components: ne zaman hangisi?", duration: "22:10" },
          { title: "Suspense, streaming ve loading.tsx", duration: "16:58" },
          { title: "Server Actions ile form akışları", duration: "24:33" },
          { title: "Edge runtime ve performans ipuçları", duration: "19:47" },
          { title: "Production deploy ve observability", duration: "21:05" },
        ],
      },
      {
        name: "Production Grade TypeScript Workshop",
        priceCents: 3900,
        stock: 80,
        sold: 18,
        lessons: [
          { title: "TypeScript düşünce yapısı", duration: "9:15", isPreview: true },
          { title: "Tip daraltma (narrowing) ipuçları", duration: "17:40" },
          { title: "Generic'ler: pratik tarifler", duration: "20:22" },
          { title: "Discriminated union ile güvenli state", duration: "15:08" },
          { title: "Zod ile runtime doğrulama", duration: "18:55" },
          { title: "Strict mode hatalarını sevmek", duration: "12:30" },
        ],
      },
    ],
  },
  {
    name: "Mehmet Yılmaz",
    email: "mehmet@hollap.demo",
    products: [
      {
        name: "UI/UX Tasarım Temelleri",
        priceCents: 2900,
        stock: 200,
        sold: 67,
        lessons: [
          { title: "Tasarım düşüncesi ve süreçler", duration: "8:20", isPreview: true },
          { title: "Renk teorisi ve kontrast", duration: "14:15" },
          { title: "Tipografi prensipleri", duration: "16:48" },
          { title: "Grid sistemleri ve hiyerarşi", duration: "12:33" },
          { title: "Kullanıcı araştırması", duration: "19:50" },
          { title: "Wireframe'den prototipe", duration: "22:14" },
        ],
      },
      {
        name: "Figma ile Sıfırdan Mobil Tasarım",
        priceCents: 3500,
        stock: 120,
        sold: 31,
        lessons: [
          { title: "Figma arayüzü tanıtımı", duration: "10:25", isPreview: true },
          { title: "Auto Layout ile responsive tasarım", duration: "18:30" },
          { title: "Bileşen kütüphanesi oluşturma", duration: "20:15" },
          { title: "Variants ve interactive bileşenler", duration: "16:42" },
          { title: "iOS ve Android için tasarım", duration: "24:08" },
          { title: "Prototip ve geliştiriciye teslim", duration: "15:20" },
        ],
      },
    ],
  },
  {
    name: "Zeynep Demir",
    email: "zeynep@hollap.demo",
    products: [
      {
        name: "12 Haftada Tam Vücut Dönüşümü",
        priceCents: 1900,
        stock: 500,
        sold: 124,
        lessons: [
          { title: "Hedef belirleme ve ölçüm", duration: "12:00", isPreview: true },
          { title: "Hafta 1-4: Temel kondisyon", duration: "28:15" },
          { title: "Hafta 5-8: Kuvvet artırma", duration: "32:40" },
          { title: "Hafta 9-12: Performans zirvesi", duration: "30:20" },
          { title: "Esneme ve toparlanma rutini", duration: "15:10" },
        ],
      },
      {
        name: "Beslenme ve Antrenman Rehberi",
        priceCents: 1500,
        stock: 300,
        sold: 89,
        lessons: [
          { title: "Makro besinler nedir?", duration: "11:30", isPreview: true },
          { title: "Kişiye özel kalori hesabı", duration: "18:45" },
          { title: "Antrenman öncesi ve sonrası beslenme", duration: "16:22" },
          { title: "Su, takviye ve uyku", duration: "14:08" },
        ],
      },
    ],
  },
  {
    name: "Can Aydın",
    email: "can@hollap.demo",
    products: [
      {
        name: "Gitar Öğreniyorum: 30 Günde Sıfırdan",
        priceCents: 2400,
        stock: 150,
        sold: 56,
        lessons: [
          { title: "Gitar parçaları ve duruş", duration: "7:30", isPreview: true },
          { title: "İlk akorlar: Am, C, G, D", duration: "15:20" },
          { title: "Akor geçişleri ve ritim", duration: "18:45" },
          { title: "Basit şarkılar çalmaya başla", duration: "22:10" },
          { title: "Parmak çıkarma teknikleri", duration: "19:33" },
          { title: "Solo gitar temelleri", duration: "24:50" },
        ],
      },
      {
        name: "Müzik Prodüksiyon Atölyesi",
        priceCents: 4200,
        stock: 60,
        sold: 12,
        lessons: [
          { title: "DAW kurulumu ve plug-in'ler", duration: "14:00", isPreview: true },
          { title: "Beat yapımı temelleri", duration: "26:15" },
          { title: "Mix temelleri: EQ, kompresyon", duration: "32:40" },
          { title: "Vokal kayıt ve düzenleme", duration: "28:20" },
          { title: "Mastering ile bitirme", duration: "22:55" },
        ],
      },
    ],
  },
  {
    name: "Elif Şahin",
    email: "elif@hollap.demo",
    products: [
      {
        name: "Profesyonel Yemek Fotoğrafçılığı",
        priceCents: 3200,
        stock: 90,
        sold: 27,
        lessons: [
          { title: "Doğal ışıkla çalışma", duration: "13:25", isPreview: true },
          { title: "Yemek stilizasyonu", duration: "20:10" },
          { title: "Kamera ayarları ve lens seçimi", duration: "17:33" },
          { title: "Sahne kompozisyonu", duration: "19:48" },
          { title: "Sosyal medya için crop ve format", duration: "12:15" },
        ],
      },
      {
        name: "Lightroom ile Renk Düzenleme",
        priceCents: 1800,
        stock: 200,
        sold: 64,
        lessons: [
          { title: "Lightroom arayüz turu", duration: "9:40", isPreview: true },
          { title: "Beyaz dengesi ve pozlama", duration: "14:22" },
          { title: "HSL paneli ile renk kontrolü", duration: "16:18" },
          { title: "Preset oluşturma ve uygulama", duration: "11:50" },
        ],
      },
    ],
  },
  {
    name: "Burak Öztürk",
    email: "burak@hollap.demo",
    products: [
      {
        name: "Etkili Türk Mutfağı Şefliği",
        priceCents: 2100,
        stock: 110,
        sold: 38,
        lessons: [
          { title: "Mutfağın temel ekipmanları", duration: "10:00", isPreview: true },
          { title: "Bıçak teknikleri", duration: "14:35" },
          { title: "Klasik mezeler", duration: "22:20" },
          { title: "Et yemekleri sırları", duration: "28:45" },
          { title: "Tatlı klasikleri", duration: "20:10" },
        ],
      },
    ],
  },
];

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
};

function nowIso() {
  return new Date().toISOString();
}

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_PREVIEW ?? process.env.DATABASE_URL_PRODUCTION;
  if (!url) {
    console.error("❌ DATABASE_URL bulunamadı. .env.local dosyasını kontrol edin.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url, max: 2 });

  try {
    await pool.query("SELECT 1");
  } catch (error) {
    console.error("❌ Veritabanına bağlanılamadı:", error.message);
    console.error("   Postgres çalışıyor mu? `npm run db:up` ile başlatabilirsiniz.");
    process.exit(1);
  }

  console.log(`${ANSI.bold}${ANSI.cyan}🌱 Hollap demo verisi yükleniyor…${ANSI.reset}\n`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  let createdCreators = 0;
  let skippedCreators = 0;
  let createdProducts = 0;

  // Admin account (idempotent)
  const adminEmail = "admin@hollap.demo";
  const adminExisting = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [adminEmail]);
  if (adminExisting.rows.length === 0) {
    const adminId = `usr_${randomUUID()}`;
    const ts = nowIso();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'admin', $5, $5, $5)`,
      [adminId, "Hollap Admin", adminEmail, passwordHash, ts],
    );
    console.log(`${ANSI.green}✓${ANSI.reset}  Hollap Admin ${ANSI.dim}<${adminEmail}>${ANSI.reset} ${ANSI.bold}(ADMIN)${ANSI.reset}`);
  }

  for (const creator of creators) {
    const existing = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [creator.email]);

    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      skippedCreators += 1;
      console.log(`${ANSI.yellow}↻${ANSI.reset}  ${creator.name} ${ANSI.dim}(zaten var)${ANSI.reset}`);
    } else {
      userId = `usr_${randomUUID()}`;
      const ts = nowIso();
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'creator', $5, $5, $5)`,
        [userId, creator.name, creator.email, passwordHash, ts],
      );
      createdCreators += 1;
      console.log(`${ANSI.green}✓${ANSI.reset}  ${creator.name} ${ANSI.dim}<${creator.email}>${ANSI.reset}`);
    }

    for (const product of creator.products) {
      const productExists = await pool.query(
        "SELECT id FROM products WHERE creator_id = $1 AND name = $2",
        [userId, product.name],
      );

      let productId;
      if (productExists.rows.length > 0) {
        productId = productExists.rows[0].id;
      } else {
        productId = `prd_${randomUUID()}`;
        const ts = nowIso();
        await pool.query(
          `INSERT INTO products (id, creator_id, name, price_cents, stock, sold, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $7)`,
          [productId, userId, product.name, product.priceCents, product.stock, product.sold, ts],
        );
        createdProducts += 1;
        console.log(`   ${ANSI.dim}└─${ANSI.reset} ${product.name} ${ANSI.dim}— $${(product.priceCents / 100).toFixed(0)}${ANSI.reset}`);
      }

      if (Array.isArray(product.lessons) && product.lessons.length > 0) {
        const existingLessons = await pool.query(
          "SELECT COUNT(*)::int AS n FROM course_lessons WHERE product_id = $1",
          [productId],
        );
        if (existingLessons.rows[0].n === 0) {
          const ts = nowIso();
          for (let i = 0; i < product.lessons.length; i += 1) {
            const lesson = product.lessons[i];
            await pool.query(
              `INSERT INTO course_lessons (id, product_id, sort_order, title, duration, video_url, is_preview, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $7)`,
              [
                `les_${randomUUID()}`,
                productId,
                i,
                lesson.title,
                lesson.duration ?? "0:00",
                lesson.isPreview ? 1 : 0,
                ts,
              ],
            );
          }
          console.log(`      ${ANSI.dim}${product.lessons.length} ders eklendi${ANSI.reset}`);
        }
      }
    }
  }

  console.log(
    `\n${ANSI.bold}${ANSI.green}✓ Tamamlandı${ANSI.reset}\n` +
      `  Yeni yaratıcı: ${createdCreators}\n` +
      `  Atlanan:       ${skippedCreators}\n` +
      `  Yeni ürün:     ${createdProducts}\n\n` +
      `${ANSI.dim}Demo şifre: ${DEMO_PASSWORD}${ANSI.reset}\n` +
      `${ANSI.dim}Yaratıcı paneli için: http://localhost:3000/login${ANSI.reset}\n`,
  );

  await pool.end();
}

main().catch((error) => {
  console.error("\n❌ Seed başarısız:", error);
  process.exit(1);
});
