# İçerik Yönetim Paneli (2. Aşama)

Panel adresi: `https://ALAN-ADI/admin` (giriş: `npm run create-admin` ile oluşturulan hesap).

## Ekranlar

| Menü | Ne yapılır |
| --- | --- |
| **Ürünler** | Ürün ekleme, düzenleme, silme, gizleme; 3 dilde metin; ürün görseli; sıra ve kategori |
| **Sayfa metinleri** | Sitedeki tüm yazılar (ana sayfa bölümleri, iç sayfalar, SEO başlık/açıklamaları, footer, çerez bandı…) 3 dilde |
| **Site ayarları** | Telefon, WhatsApp, e-posta, adres, sosyal medya adresleri |
| **Yayınla** (sol alt) | Kaydedilen değişiklikleri siteye uygular |

### Nasıl çalışır?
1. Değişiklik yapıp **Kaydet**'e basın (veritabanına kaydedilir, site henüz değişmez).
2. Sol alttaki kutu "Yayınlanmamış değişiklikler var" der → **Yayınla**'ya basın.
3. Sunucu siteyi yeni içerikle yeniden oluşturur (genelde 10–30 sn). Her sayfa Google için
   hazır HTML olarak üretilir, sitemap güncellenir. Eski site, yenisi tamamen hazır olana kadar
   yayında kalır; ziyaretçiler yarım bir site görmez. Derleme hata verirse eski site aynen kalır.

### Ürünler
- Boş bırakılan İngilizce/Arapça alanlarda Türkçe metin gösterilir.
- **Sayfa adresi (slug)** ürün sayfasının adresidir (`/tr/products/adblue-tank`). Yayındaki bir ürünün
  adresini değiştirmeyin: Google'daki kayıt ve paylaşılan bağlantılar çalışmaz.
- Görsel: JPG/PNG/WEBP, en fazla 5 MB. Şeffaf arka planlı ürün fotoğrafı en iyi sonucu verir. Görsel
  yoksa sitede tank çizimi gösterilir.
- **Ticari bilgiler** (SKU, fiyat, stok, online satış): yalnızca veritabanında saklanır, siteye
  **gönderilmez**. İleride e-ticaret açıldığında kullanılacak.
- Kategoriler sabittir (Endüstriyel/Kimyasal/Su/Tarım/Özel). Yeni kategori geliştirme gerektirir.

### Sayfa metinleri
- Boş alan = sitedeki varsayılan metin (gri yazı olarak görünür). "Varsayılana dön" özelleştirmeyi kaldırır.
- `{{name}}` gibi süslü parantezli ifadeler otomatik doldurulur; silmeyin.
- Arama kutusu tüm bölümlerde arar.

## İlk kurulum (sunucuda bir kez)

```bash
cd server
npm install
npm run seed-content     # sitedeki mevcut 5 ürünü ve iletişim bilgilerini veritabanına aktarır
```

Veritabanında hiç ürün yoksa site kendi içindeki ürün listesini gösterir. İlk ürün eklendiği
(veya seed çalıştırıldığı) andan itibaren ürünler tamamen panelden yönetilir.

## Sunucu gereksinimleri
- API ve site projesi (`client/`) aynı sunucuda; `client` klasöründe `npm install` yapılmış olmalı
  (Yayınla bu klasörde `npm run build` çalıştırır). Farklı konumdaysa `server/.env` → `CLIENT_DIR`.
- nginx `client/dist` klasörünü sunar (bkz. `docs/analytics-seo-setup.md`); ürün görselleri için:

```nginx
location /uploads/ {
  alias /var/www/rma/server/uploads/;
  add_header Cache-Control "public, max-age=2592000";
}
```

- Yedekleme: MongoDB veritabanı + `server/uploads` klasörü.

## Geliştirme ortamı
`npm run dev` sitenin son çekilen içeriğini kullanır. Veritabanındaki güncel içeriği yerelde görmek için
API çalışırken `cd client && npm run content:pull`.
