# Ölçüm, SEO ve Yayın Kurulumu (1. Aşama)

Bu belge sitenin Google Tag Manager (GTM), GA4, Google Ads, Meta Pixel, Hotjar,
Search Console ve sunucu ayarlarının nasıl yapılacağını anlatır.

Site tarafında her şey hazır: siteye yalnızca **GTM kodu** eklenir; diğer tüm
etiketler GTM panelinden yönetilir. Böylece yeni bir etiket için siteye kod
yazmak gerekmez.

---

## 1. Site ayarları (`client/.env`)

`client/.env.example` dosyasını `client/.env` olarak kopyalayıp doldurun:

| Değişken | Açıklama |
| --- | --- |
| `VITE_SITE_URL` | Canlı alan adı, örn. `https://www.rmaplastik.com` (sonda `/` yok) |
| `VITE_GTM_ID` | GTM container kimliği, örn. `GTM-ABC1234` |
| `VITE_GSC_VERIFICATION` | (İsteğe bağlı) Search Console "HTML etiketi" doğrulama kodu |

Sonra `cd client && npm run build`. Çıktı `client/dist` klasöründedir.

> `VITE_GTM_ID` boşsa site hiçbir izleme kodu yüklemez (geliştirme ortamı için).

---

## 2. Sitenin GTM'e gönderdiği olaylar (dataLayer)

| Olay | Ne zaman | Parametreler |
| --- | --- | --- |
| `virtual_page_view` | Her sayfa açılışı ve site içi geçiş | `page_location`, `page_path`, `page_title`, `site_language` |
| `generate_lead` | Teklif formu **başarıyla** gönderildiğinde | `form_name`, `product`, `country`, `site_language` |
| `quote_form_open` | Teklif penceresi açıldığında | `product` |
| `contact_click` | Telefon, e-posta veya WhatsApp linkine tıklandığında | `contact_method` (`phone`/`email`/`whatsapp`), `click_area`, `page_path` |
| `consent_update` | Ziyaretçi çerez tercihini kaydettiğinde | `consent_analytics`, `consent_marketing` |

**Çerez onayı (Consent Mode v2):** Varsayılan olarak `analytics_storage`,
`ad_storage`, `ad_user_data`, `ad_personalization` = **denied**. Ziyaretçi izin
verince site `gtag('consent','update', …)` gönderir. Kaydedilmiş tercih, sonraki
ziyarette GTM yüklenmeden önce uygulanır.

---

## 3. GTM container kurulumu

### 3.1 Değişkenler
*Değişkenler → Yeni → Veri Katmanı Değişkeni* ile şunları oluşturun:
`page_location`, `page_path`, `page_title`, `site_language`, `product`,
`country`, `contact_method`, `click_area`, `form_name`.

### 3.2 Tetikleyiciler (Özel Etkinlik)
| Ad | Etkinlik adı |
| --- | --- |
| CE – virtual_page_view | `virtual_page_view` |
| CE – generate_lead | `generate_lead` |
| CE – contact_click | `contact_click` |
| CE – quote_form_open | `quote_form_open` |

### 3.3 GA4 — **mevcut verilerin korunması için önemli**
1. **Google etiketi** oluşturun, Etiket kimliği = **mevcut GA4 ölçüm kimliğiniz** (`G-…`).
   Yeni bir GA4 mülkü açmayın; aynı kimlik kullanıldığında geçmiş veriler aynen kalır.
2. Yapılandırma parametresi: `send_page_view` = `false` (sayfa görüntülemeyi aşağıdaki olay gönderir).
   Tetikleyici: *Initialization – All Pages*.
3. **GA4 Etkinliği** – `page_view`: parametreler `page_location`, `page_path`, `page_title`, `site_language`.
   Tetikleyici: *CE – virtual_page_view*.
4. **GA4 Etkinliği** – `generate_lead` (parametreler: `product`, `country`, `form_name`). Tetikleyici: *CE – generate_lead*.
5. **GA4 Etkinliği** – `contact_click` (parametreler: `contact_method`, `click_area`). Tetikleyici: *CE – contact_click*.
6. GA4 panelinde *Yönetici → Etkinlikler* bölümünde `generate_lead` ve `contact_click`'i **önemli etkinlik (dönüşüm)** olarak işaretleyin.

> Eski site GA4'ü sayfa koduyla (gtag.js) yüklüyorsa, yeni sitede yalnızca GTM
> içindeki Google etiketi kalmalı; aynı kimliği iki kez yüklemeyin (çift sayım olur).

### 3.4 Google Ads
1. **Conversion Linker** etiketi – Tetikleyici: *All Pages*.
2. **Google Ads Dönüşüm İzleme** – Dönüşüm kimliği (`AW-…`) ve dönüşüm etiketi.
   Tetikleyici: *CE – generate_lead* (teklif formu). İsterseniz `contact_method = whatsapp` / `phone`
   koşullu ikinci bir dönüşüm ekleyin.
3. İsteğe bağlı: **Google Ads Yeniden Pazarlama** – Tetikleyici: *CE – virtual_page_view*.

### 3.5 Meta (Facebook) Pixel
GTM Topluluk Şablonu galerisinden **"Facebook Pixel"** şablonunu ekleyin:
- Pixel ID girin, `PageView` – Tetikleyici: *CE – virtual_page_view*
- `Lead` – Tetikleyici: *CE – generate_lead*
- `Contact` – Tetikleyici: *CE – contact_click*
- *Gelişmiş Ayarlar → İzin Ayarları → Ek izin gerekir*: `ad_storage`

### 3.6 Hotjar
**Hotjar Tracking Code** etiketi (yerleşik şablon), Site ID girin. Tetikleyici: *All Pages*.
*İzin Ayarları → Ek izin gerekir*: `analytics_storage`.

### 3.7 İzin kontrolü
*Yönetici → Container Ayarları → "İzne genel bakışı etkinleştir"*. Google etiketleri
Consent Mode'u otomatik okur; Meta ve Hotjar için yukarıdaki "ek izin" ayarlarını yapın.

### 3.8 Test ve yayın
GTM'de **Önizleme** ile siteyi açın; sayfa geçişi, teklif gönderimi ve WhatsApp
tıklamasında olayların göründüğünü kontrol edin, sonra **Gönder → Yayınla**.

### 3.9 Kurulu durum (Ekim 2026)
| | Kimlik |
| --- | --- |
| GTM container | `GTM-NH4V3TWX` (GitHub değişkeni `VITE_GTM_ID`) |
| GA4 ölçüm kimliği | `G-15MEPYKQ44` |
| Google Ads | `AW-18530639193`, dönüşüm "Teklif Talebi" (birincil) |

Container içeriği `docs/gtm/` klasöründeki iki dosyadan içe aktarıldı:
- `rma-gtm-ga4.json` – GA4 Google etiketi, `page_view`, site olayları, Conversion Linker
- `rma-gtm-ads.json` – Ads Google etiketi ve "Teklif Talebi" dönüşümü
  (yalnızca `generate_lead` + `form_name = quote`; katalog formu sayılmaz)

> Yeniden içe aktarırken üstte mutlaka **Birleştir** seçin. **Üzerine yaz**
> bütün container'ı dosyanın içeriğiyle değiştirir ve diğer etiketleri siler.

---

## 4. Google Search Console

1. Mülk ekleyin: tercihen **Alan adı** mülkü (DNS TXT kaydıyla) – tüm alt alan adlarını ve http/https'i kapsar.
   Alternatif: *URL öneki* + "HTML etiketi" → kodu `VITE_GSC_VERIFICATION`'a girin ve yeniden derleyin.
   GTM veya GA4 aynı Google hesabındaysa "Google Tag Manager" yöntemiyle de doğrulanabilir.
2. *Site haritaları* → `https://ALAN-ADI/sitemap.xml` gönderin (derlemede otomatik üretilir; 3 dil, hreflang dahil).
3. GA4 ↔ Search Console bağlantısı: GA4 *Yönetici → Ürün bağlantıları → Search Console*.
4. Anahtar kelime verisi: *Performans → Arama sonuçları → Sorgular* (son 12 ay) dışa aktarın; SEO içerik planı bu listeyle yapılacak.

---

## 5. Sunucu / hosting ayarları

Derleme çıktısı statik dosyalardır: her sayfa `dist/<dil>/<sayfa>/index.html`
olarak hazır HTML içerir (Google JavaScript çalıştırmadan içeriği görür).

Gerekli kurallar:
- **SSL** (Let's Encrypt ücretsiz) ve `http → https` 301 yönlendirmesi.
- Tek alan adı: `rmaplastik.com` ↔ `www.rmaplastik.com` birinden diğerine 301 (`VITE_SITE_URL` ile aynı olan kalsın).
- `/` → `/tr` 301 yönlendirmesi.
- Her istek için önce hazır dosya, yoksa `index.html` (uygulama kabuğu).
- `/assets/*` uzun süreli önbellek (dosya adları içerik özetli).
- **Eski sitenin adresleri** yeni adreslere 301 ile yönlendirilmeli (liste eski siteden çıkarılacak).

**cPanel / LiteSpeed (Hosting.com.tr):** bu kuralların hepsi `client/public/.htaccess` dosyasında hazırdır ve
derlemeyle `public_html` içine gider (bkz. `docs/hosting-com-tr-deployment.md`).

Kendi sunucunuzda örnek **nginx**:

```nginx
server {
  listen 80;
  server_name rmaplastik.com www.rmaplastik.com;
  return 301 https://www.rmaplastik.com$request_uri;
}

server {
  listen 443 ssl http2;
  server_name www.rmaplastik.com;
  root /var/www/rma/client/dist;

  # ssl_certificate ... (certbot)

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml application/xml;

  location = / { return 301 /tr; }

  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  location /uploads/ {
    alias /var/www/rma/server/uploads/;
    add_header Cache-Control "public, max-age=2592000";
  }

  location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    add_header Cache-Control "no-cache";
    try_files $uri $uri/index.html /index.html;
  }

  # Eski site yönlendirmeleri (örnek)
  # location = /urunler/su-deposu.html { return 301 /tr/products/water-storage-tank; }
}
```

API arkasında tek bir nginx varsa `server/.env` içinde `TRUST_PROXY=1` yapın.
