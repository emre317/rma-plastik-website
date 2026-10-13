# İçerik Yönetim Paneli (2. Aşama)

Panel adresi: `https://ALAN-ADI/admin` (giriş: `npm run create-admin` ile oluşturulan hesap).

## Kullanıcılar ve şifreler

- İlk hesap sunucuda `npm run create-admin` ile açılır. Diğer kullanıcılar panelde **Ayarlar › Kullanıcılar › Kullanıcı Ekle** ile eklenir:
  - **Davet E-postası Gönder:** kişiye 72 saat geçerli bir bağlantı gider, şifresini kendisi belirler.
  - **Şifreyi Ben Belirleyeyim:** şifreyi siz belirler ("Şifre Oluştur" ile güçlü bir şifre üretilip panoya kopyalanır) ve kişiye güvenli bir yoldan iletirsiniz.
- Giriş ekranındaki **Şifremi Unuttum** bağlantısı 1 saat geçerli bir sıfırlama e-postası gönderir. Kullanıcılar sayfasından başka bir kullanıcıya sıfırlama bağlantısı gönderilebilir ya da yeni şifresi doğrudan belirlenebilir.
- Şifre en az 8 karakter olmalı ve en az bir harf ile bir rakam içermeli. Şifre değişince o hesabın diğer cihazlardaki oturumları kapanır.
- **Roller:** Her kullanıcının bir rolü vardır:
  - **Yönetici:** tüm bölümler, kullanıcılar, site ayarları ve işlem geçmişi.
  - **Satış:** teklif talepleri, proforma, satış raporu ve potansiyel müşteriler.
  - **İçerik:** ürün tabloları, blog, projeler, saha fotoğrafları, SSS, ihracat ağı, videolar, sayfa metinleri ve yayınlama.
  Menü, kullanıcının rolüne göre değişir; sunucu da yetkisiz işlemleri reddeder. Rol değişikliği bir sonraki sayfa açılışında geçerli olur.
- Pasif yapılan kullanıcı giriş yapamaz. Kimse kendi hesabını silemez, pasif yapamaz veya rolünü değiştiremez; en az bir aktif Yönetici her zaman kalır.
- Herkes kendi şifresini **Hesabım** sayfasından değiştirebilir (kenar çubuğunda adınıza tıklayın).
- **İşlem Geçmişi (Ayarlar › İşlem Geçmişi):** Kim, neyi, ne zaman yaptı: talep durumu ve takip değişiklikleri, notlar, proforma kaydetme/gönderme, Excel aktarma, içerik ekleme/güncelleme/silme, yayınlama, kullanıcı işlemleri, girişler ve başarısız giriş denemeleri. Kayıtlar iki yıl saklanır. Her teklif talebinin detayında da o talebin geçmişi görünür.
- E-postalar için sunucuda SMTP ayarları ve `CLIENT_URL` (bağlantılardaki site adresi) gerekir. SMTP yoksa davet/sıfırlama e-postası gönderilemez; şifreler Kullanıcılar sayfasında belirlenir.

## Ekranlar

| Menü | Ne yapılır |
| --- | --- |
| **Ürünler** | Ürün ekleme, düzenleme, silme, gizleme; 3 dilde metin; ürün görseli; sıra ve kategori |
| **Ürün tabloları** | Ürün Tabloları ve Su Depoları sayfalarındaki model tabloları: ürün aileleri, sütunlar, modeller (Excel’den yapıştırma), görseller, su deposu seçici ayarları |
| **Sayfa metinleri** | Sitedeki tüm yazılar (ana sayfa bölümleri, iç sayfalar, SEO başlık/açıklamaları, footer, çerez bandı…) 3 dilde |
| **Blog yazıları** | 3 dilde yazı, kapak görseli, metin içi görsel, YouTube videosu, ilgili ürünler, SEO başlık/açıklama, zamanlanmış yayın |
| **Videolar** | YouTube videolarını bağlantıyla ekleme; Videolar sayfasında gösterim |
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

### Ürün tabloları
- Veritabanında tablo yokken sitede broşürdeki tablolar (21 ürün ailesi, 162 model) gösterilir.
  Düzenlemek için ekrandaki **Broşür tablolarını içe aktar** butonuna basın (veya `npm run seed-content`).
- Her ürün ailesi: 3 dilde başlık ve açıklama, grup, sıra, görsel ve tabloda görünecek **sütunlar**.
- **Modeller:** “Satır ekle” ile tek tek veya **Excel’den yapıştır** ile toplu eklenir. Excel’de sütun
  sırası ekranda yazan sırayla aynı olmalıdır (ilk sütun ürün kodu). Satırlar ↑ ↓ ile sıralanır, ⧉ ile kopyalanır.
- Sayılar (1000, 48) sıralama ve filtrelerde kullanılır; “40-60”, “35 x 35”, 3/4" gibi değerler yazıldığı gibi gösterilir.
- Bir modele özel görsel eklenebilir; boşsa ailenin görseli kullanılır (Su Depoları kartları ve teklif formu).
- **Su deposu seçici:** işaretlenen ailelerin modelleri Su Depoları sayfasında filtrelenir (tip, yapı ve kullanım
  alanları buradan seçilir). Hacim ve Yükseklik sütunları dolu olmalıdır.
- Bir ürün ailesini sitede gizlemek için “Yayında / Gizli” düğmesini kullanın; silmek geri alınamaz.
- **Excel ile toplu güncelleme:** “Excel’e aktar” tüm modelleri tek dosyada indirir (Modeller sayfası).
  Dosyayı düzenleyip “Excel’den içe aktar” ile yükleyin; önce hangi ailede kaç modelin eklendiği/silindiği/değiştiği
  gösterilir, “Uygula” deyince kaydedilir. Dosyada olmayan aileler değişmez, model görselleri ürün koduna göre korunur.
  Dosyada panelde olmayan bir aile kimliği ve “Aile adı (TR)” varsa yeni aile **gizli** olarak eklenir.
- **Model sayfaları:** her model için otomatik bir sayfa oluşur (ör. `/tr/product-tables/vertical-tanks/rd-5000`).
  Adres ürün kodundan üretilir; yayındaki bir modelin kodunu değiştirmek adresini de değiştirir.
- **Teklif sepeti:** ziyaretçiler birden fazla modeli sepete ekleyip adetleriyle tek talep gönderebilir; talep
  detayında ve bildirim e-postasında “Teklif sepeti” listesi görünür.

### Blog yazıları
- **Taslak** sitede görünmez; **Yayına al** dedikten sonra “Yayınla” ile siteye çıkar.
- Yayın tarihi ileri bir tarihse yazı zamanlanır; o tarihten sonraki ilk “Yayınla”da görünür.
- Yazı yalnızca **başlığı ve metni dolu olan dillerde** yayınlanır (boş dil için sayfa oluşturulmaz,
  Google'da tekrar eden içerik oluşmaz).
- Metin biçimi: `## Ara başlık`, `**kalın**`, `- liste`, `[bağlantı](https://…)`, tablo. Araç çubuğu
  ve **Önizleme** düğmesi yardımcı olur. Güvenlik için metne yazılan HTML kodu çalıştırılmaz.
- “Google görünümü (SEO)” bölümünde başlığın ve açıklamanın Google'da nasıl görüneceği önizlenir
  (başlık ~60, açıklama ~160 karakter önerilir).
- İlgili ürünler yazının sonunda bağlantı olarak çıkar; yazının sonundaki “Teklif Al” butonu
  ilk seçilen ürünü forma otomatik yazar.
- `npm run seed-content` ile 4 adet **taslak** yazı gelir (rotasyonel kalıplama, LLDPE/HDPE,
  kimyasal tank seçimi, AdBlue depolama). Genel teknik bilgilerdir; **yayından önce teknik
  ekip kontrol etmeli** ve firmaya özel bilgilerle zenginleştirilmelidir.

### Videolar
- YouTube bağlantısını yapıştırın (youtu.be, watch?v=, shorts bağlantıları kabul edilir).
- Sayfada önce yalnızca kapak görüntüsü yüklenir, video tıklanınca oynar (site hızlı kalır).
- **YouTube yükleme tarihi** girilen videolar Google video sonuçları için işaretlenir.

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
