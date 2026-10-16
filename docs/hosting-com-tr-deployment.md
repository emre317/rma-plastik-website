# Hosting.com.tr Node.js Dev Hosting – Canlıya Alma Rehberi

Bu belge RMA Plastik web sitesini ve yönetim panelini Hosting.com.tr **Node.js Dev Hosting**
paketinde (paylaşımlı CloudLinux + cPanel + LiteSpeed) yayınlamayı anlatır. VPS gerekmez;
root erişimi, Nginx ya da PM2 kullanılmaz.

> **Önemli:** Aşağıda "⚠️ Doğrulayın" ile işaretli maddeler hosting firmasından teyit edilmelidir.
> Bu ortamda gerçek hosting hesabına erişim olmadığı için bu maddeler test edilmemiştir.

---

## 1. Mimari

```
Ziyaretçi ──HTTPS──► LiteSpeed (public_html)
                      ├─ /, /tr/…, /en/…, /ar/…   ön-render edilmiş HTML + JS/CSS (statik)
                      ├─ /admin, bilinmeyen URL   index.html (React uygulaması)
                      ├─ /uploads/…               ~/rma-data/uploads klasörüne sembolik bağlantı
                      └─ /api/…                   Passenger ► Node.js (Express) ► MongoDB Atlas

Yönetici "Yayınla" ► API ► GitHub Actions (publish-site.yml)
                             ├─ GET /api/content (CONTENT_API_TOKEN)
                             ├─ npm run build (Vite + TR/EN/AR prerender + sitemap + robots)
                             ├─ SSH/SFTP (veya FTPS) ile public_html'e yükleme
                             └─ her aşamayı POST /api/publish/callback ile bildirir
```

- **React derlemesi hostingde çalışmaz.** Derleme GitHub Actions'ta yapılır, hostinge yalnızca hazır dosyalar gider.
- **Eski site, yenisi tamamen yüklenip doğrulanana kadar yayında kalır.** Derleme ya da yükleme
  başarısız olursa site değişmez (ayrıntı: [§10](#10-site-yayınlama-süreci)).
- **Yayın durumu MongoDB'de tutulur.** Sunucu yeniden başlasa da panelde kaybolmaz.

### Hosting firmasından doğrulanması gerekenler ⚠️

| # | Soru | Neden gerekli | Olumsuzsa |
|---|---|---|---|
| 1 | cPanel'de **Setup Node.js App** var mı, Node.js **22.x** seçilebiliyor mu? | API'nin çalışması | – (zorunlu) |
| 2 | Uygulama **Application URL** olarak `www.rmaplastik.com/api` gibi bir **alt yol** kabul ediyor mu? | API'nin aynı alan adında çalışması | `api.rmaplastik.com` alt alan adını kullanın ([§5.3](#53-alternatif-apirmaplastikcom-alt-alan-adı)) |
| 3 | SSH açık mı, **SSH anahtarıyla** giriş yapılabiliyor mu? Port numarası nedir? | GitHub Actions ile yükleme ve geri alma | FTPS ile yükleme ([§9.3](#93-ssh-yoksa-ftps)) |
| 4 | Sunucuda `rsync` ve `tar` var mı? | Hızlı ve kesintisiz yükleme | Betik `rsync` yoksa `cp` + `find` kullanır; `tar` zorunlu |
| 5 | Sunucudan **dışarıya** 443 (MongoDB Atlas 27017) ve 587 (SMTP) portları açık mı? | Atlas ve e-posta bağlantısı | Firmadan açılmasını isteyin |
| 6 | Sunucunun **çıkış (outbound) IP adresi** nedir? | Atlas IP erişim listesi | – |
| 7 | `public_html` içinde **sembolik bağlantıya** (symlink) izin var mı? | `/uploads` görsellerinin sunulması | `UPLOAD_DIR` doğrudan `public_html/uploads` yapılabilir ([§6](#6-görsel-yüklemeleri-uploads)) |
| 8 | `.htaccess` içinde `DirectorySlash Off`, `mod_rewrite`, `mod_headers` destekleniyor mu? | Sayfa adresleri ve önbellek | Sorun çıkarsa [§14](#14-sorun-giderme) |
| 9 | Passenger arkasında kaç proxy katmanı var? | `TRUST_PROXY` ve hız sınırları | Genelde 1 |
| 10 | LVE limitleri: eşzamanlı süreç (EP/NPROC), bellek, disk kotası | `npm ci` ve uygulama | Gerekirse limit artırımı |

---

## 2. Hostingdeki klasör düzeni

```
/home/<cpanel-kullanıcısı>/
├── public_html/                 ← site (GitHub Actions doldurur, elle düzenlemeyin)
│   ├── .htaccess                ← client/public/.htaccess'ten gelir
│   ├── api/.htaccess            ← cPanel Node.js App yazar (dağıtım dokunmaz)
│   ├── uploads  → /home/<kullanıcı>/rma-data/uploads   (sembolik bağlantı, dağıtım dokunmaz)
│   └── .well-known/             ← SSL doğrulaması (dağıtım dokunmaz)
├── rma-app/                     ← API kodu (deploy-api.yml doldurur)
│   ├── server/                  ← cPanel "Application root"
│   │   ├── passenger.cjs        ← "Application startup file"
│   │   ├── .env                 ← üretim ayarları (git'e girmez, dağıtım dokunmaz)
│   │   └── tmp/restart.txt      ← dokunulunca uygulama yeniden başlar
│   └── client/src/data, client/src/i18n/locales   ← API'nin okuduğu hazır veriler
├── rma-data/uploads/            ← yüklenen görseller (kalıcı, yedeklenir)
├── rma-deploy/                  ← sürümler ve geri alma kopyaları
│   ├── releases/<sürüm>/        ← son 5 site sürümü
│   ├── api-releases/            ← API sürümleri + önceki kodun yedeği
│   └── current                  ← yayındaki site sürümü
├── rma-backups/db/              ← veritabanı yedekleri (npm run backup-db)
└── nodevenv/rma-app/server/22/  ← cPanel'in Node.js ortamı (otomatik)
```

> **Neden API kodu `rma-app/server` altında?** API bazı hazır verileri (`offerText.js`, ürün grupları,
> sektörler, dil dosyaları) `../client/src/...` yolundan okur. Bu klasör düzeni repodaki düzenle
> aynı olduğu için kodda değişiklik gerekmez.

---

## 3. MongoDB Atlas kurulumu

1. [cloud.mongodb.com](https://cloud.mongodb.com) üzerinde bir proje ve **cluster** oluşturun.
   - Bölge: Frankfurt (`eu-central-1`) gibi Türkiye'ye yakın bir bölge seçin.
   - Paket: Başlangıç için M0 (ücretsiz) çalışır. Ancak M0'da **otomatik yedek yoktur**; canlı
     kullanım için M10 ya da üstü önerilir ([§12](#12-yedekleme-ve-geri-alma)).
2. **Database Access** › *Add New Database User*
   - Kullanıcı: örneğin `rma-api`; güçlü ve rastgele bir şifre verin.
   - Yetki: yalnızca bu veritabanı için *readWrite* (`rma-plastik`).
3. **Network Access** › *Add IP Address*
   - Hosting sunucusunun **çıkış IP adresini** ekleyin ⚠️ (firmadan öğrenin).
   - `0.0.0.0/0` (her yer) **kullanmayın**. Kullanmak zorunda kalırsanız güçlü şifre şarttır ve
     bu geçici bir çözüm olmalıdır.
   - IP değişirse API "DEGRADED" durumuna düşer: `/api/health` → `"database":"connecting"`.
4. **Connect › Drivers** ekranından bağlantı adresini alın ve `MONGODB_URI` olarak girin:
   ```
   mongodb+srv://rma-api:<şifre>@<cluster>.mongodb.net/rma-plastik?retryWrites=true&w=majority
   ```
   - `mongodb+srv://` ile TLS kendiliğinden açıktır.
   - Şifrede `@ : / ? #` gibi karakterler varsa URL-encode edin.
5. **Mevcut verileri taşıma** (yerel MongoDB'den): kendi bilgisayarınızda MongoDB Database Tools ile
   ```bash
   mongodump --uri "mongodb://127.0.0.1:27017/rma-plastik" --out ./dump
   mongorestore --uri "mongodb+srv://rma-api:<şifre>@<cluster>.mongodb.net/rma-plastik" ./dump/rma-plastik
   ```
   Modeller ve kayıtlar aynen korunur; ayrıca bir veri dönüştürme (migration) gerekmez. Ek olarak:
   - Eski sürümde kaydedilmiş ürün tabloları (5 kategorili) yeni ürün gruplarına kendiliğinden eşlenir.
   - Kategorisi kaydedilmemiş ürün grupları, hazır listedeki kategorisini kullanır.

**Bağlantı davranışı (`server/config/db.js`):**
- İlk bağlantı başarısız olursa uygulama kapanmaz; 5, 10 … 60 saniye arayla yeniden dener.
  Bu sürede `/api/health` 503 ve `DEGRADED` döner.
- Bağlantı koparsa olay loglanır ve sürücü kendiliğinden yeniden bağlanır. Bu arada gelen istekler
  8 saniye sonra hata verir; sonsuza kadar beklemez.
- `MONGODB_MAX_POOL` (varsayılan 10) CloudLinux süreç limitleri için düşük tutulmuştur.
- Loglarda şifre hiçbir zaman yazılmaz (`mongodb+srv://***@…`).

---

## 4. Ortam değişkenleri

Örnek dosyalar: `server/.env.production.example` (API) ve `client/.env.production.example` (site).
Gerçek değerler **asla git'e girmez**.

### 4.1 API (cPanel › Setup Node.js App › Environment variables veya `rma-app/server/.env`)

| Değişken | Örnek / Açıklama |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Boş bırakın (Passenger kendisi verir) |
| `MONGODB_URI` | Atlas adresi ([§3](#3-mongodb-atlas-kurulumu)) |
| `MONGODB_MAX_POOL` | `10` (isteğe bağlı) |
| `JWT_SECRET` | En az 32 karakter, rastgele. Değiştirirseniz tüm oturumlar kapanır |
| `CLIENT_URL` | `https://www.rmaplastik.com`. İlk değer e-posta bağlantılarında (şifre sıfırlama, davet) kullanılır; virgülle birden çok origin verilebilir |
| `TRUST_PROXY` | `1` (LiteSpeed + Passenger) ⚠️ |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | Uzman Posta: `proxy.uzmanposta.com` / `587` / `false` / `web@rmaplastik.com` / şifre |
| `MAIL_FROM` | İsteğe bağlı, örn. `'"RMA Plastik" <web@rmaplastik.com>'` |
| `QUOTE_NOTIFY_TO` | Teklif bildirimlerinin gideceği adres(ler) |
| `QUOTE_CONFIRM_CUSTOMER` | `true` (müşteriye referans numaralı onay e-postası) |
| `UPLOAD_DIR` | `/home/<kullanıcı>/rma-data/uploads` |
| `PUBLISH_MODE` | `github` |
| `PUBLISH_GITHUB_TOKEN` | Fine-grained token ([§8.1](#81-github-token-api-için)) |
| `PUBLISH_GITHUB_REPOSITORY` | `emre317/rma-plastik-website` |
| `PUBLISH_GITHUB_WORKFLOW` / `PUBLISH_GITHUB_REF` | `publish-site.yml` / `main` |
| `CONTENT_API_TOKEN` | Rastgele, en az 24 karakter. GitHub secret'ı ile **aynı** |
| `PUBLISH_CALLBACK_TOKEN` | Rastgele, en az 24 karakter. GitHub secret'ı ile **aynı** |
| `PUBLISH_TIMEOUT_MIN` | `40` (bitmeyen yayın bu süreden sonra "başarısız" sayılır) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Yalnızca ilk yönetici için; sonra silin |

Rastgele değer üretmek için:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Uygulama açılırken ayarları kontrol eder:
- Kritik eksiklerde başlamaz (log'da `[env] …` satırları görünür). Örnekler: eksik `JWT_SECRET`,
  32 karakterden kısa `JWT_SECRET`, eksik `CONTENT_API_TOKEN`.
- Diğer eksikleri uyarı olarak yazar.

Elle kontrol için:
```bash
npm run check-env               # yalnızca değişkenler
npm run check-env -- --db       # + Atlas bağlantısı
npm run check-env -- --smtp     # + SMTP girişi (e-posta göndermez)
```

### 4.2 Site derlemesi (GitHub › Settings › Secrets and variables › Actions › **Variables**)

`VITE_` ile başlayan değerler **tarayıcıdaki JavaScript'e gömülür**; bu yüzden içlerine asla şifre ya da
token yazılmaz.

| Variable | Değer |
|---|---|
| `SITE_URL` | `https://www.rmaplastik.com` (canonical, sitemap, hreflang) |
| `API_URL` | `https://www.rmaplastik.com` (sonda `/api` **yok**; alt alan adıyla: `https://api.rmaplastik.com`) |
| `VITE_API_URL` | Boş (aynı alan adı). Alt alan adıyla: `https://api.rmaplastik.com/api` |
| `VITE_GTM_ID` | `GTM-XXXXXXX` (bkz. `docs/analytics-seo-setup.md`) |
| `VITE_GSC_VERIFICATION` | İsteğe bağlı |
| `DEPLOY_METHOD` | `ssh` (önerilen) veya `ftps` |
| `DEPLOY_PATH` | `public_html` |
| `DEPLOY_APP_DIR` | `rma-app` |
| `NODEVENV_ACTIVATE` | `nodevenv/rma-app/server/22/bin/activate`. cPanel ekranının üstündeki "source …" komutunda yazan yol |
| `MIN_PAGES` | `100` (bundan az sayfa üretilirse yayınlanmaz) |
| `AUTO_DEPLOY_ON_PUSH` | `false`. `true` yapılırsa `client/` değiştiğinde site otomatik yayınlanır |

---

## 5. cPanel Node.js uygulaması

### 5.1 Uygulamayı oluşturma (Setup Node.js App › Create Application)

| Alan | Değer |
|---|---|
| Node.js version | **22.x** (hostingdeki 22 sürümü) |
| Application mode | Production |
| Application root | `rma-app/server` |
| Application URL | `www.rmaplastik.com` + `api` → `https://www.rmaplastik.com/api` ⚠️ |
| Application startup file | `passenger.cjs` |
| Environment variables | [§4.1](#41-api-cpanel--setup-nodejs-app--environment-variables-veya-rma-appserverenv) |

**Neden `passenger.cjs`?** Passenger başlangıç dosyasını `require()` ile yükler. API ise ES modülü ve
`top-level await` kullanıyor; bu `require()` ile yüklenemez. `passenger.cjs` API'yi `import()` ile açan
küçük bir köprüdür.

**`/api` öneki:** Passenger, isteği uygulamaya `/api/health` ya da `/health` olarak iletebilir. Uygulama
iki biçimi de aynı yere yönlendirir; ayar gerekmez.

Uygulama oluşunca cPanel `public_html/api/.htaccess` dosyasını yazar. Bu dosya dağıtımlarda
**silinmez** (`deploy/remote-site.sh` `api/` klasörünü korur).

### 5.2 Kodu yükleme ve bağımlılıkları kurma

**Yol A – GitHub Actions (önerilen):** *Actions › Deploy API › Run workflow*. Workflow:
1. Testleri çalıştırır.
2. `server/` ve gerekli `client/src` dosyalarını paketleyip SSH ile `~/rma-app` altına kopyalar.
   `.env`, `node_modules`, `uploads`, `tmp` ve log dosyalarına dokunmaz.
3. cPanel'in Node.js ortamında `npm ci --omit=dev` çalıştırır.
4. `tmp/restart.txt` dosyasına dokunarak uygulamayı yeniden başlatır.
5. `API_URL/api/health` adresini kontrol eder.

**Yol B – elle (SSH):**
```bash
# kendi bilgisayarınızda, repo kökünde
tar -czf api.tar.gz --exclude=server/node_modules --exclude=server/uploads --exclude='server/.env*' --exclude=server/test \
  server client/src/data/offerText.js client/src/data/productGroups.builtin.js client/src/data/sectors.builtin.js \
  client/src/data/productTables.builtin.js client/src/data/exportMarkets.builtin.js client/src/data/projects.builtin.js \
  client/src/i18n/locales/tr.js client/src/i18n/locales/en.js client/src/i18n/locales/ar.js
scp -P <port> api.tar.gz <kullanıcı>@<sunucu>:rma-deploy/incoming/
ssh -p <port> <kullanıcı>@<sunucu> 'bash -s -- manual1 ~/rma-deploy/incoming/api.tar.gz rma-app nodevenv/rma-app/server/22/bin/activate' < deploy/remote-api.sh
```
Alternatif olarak cPanel ekranındaki **Run NPM Install** ve **Restart** düğmeleri de kullanılabilir.

### 5.3 Alternatif: `api.rmaplastik.com` alt alan adı

Hosting alt yolu (`/api`) desteklemiyorsa:
1. cPanel › Domains › `api.rmaplastik.com` alt alan adını oluşturun ve SSL'ini etkinleştirin.
2. Node.js App › Application URL: `api.rmaplastik.com` (kök).
3. GitHub variables:
   - `API_URL=https://api.rmaplastik.com`
   - `VITE_API_URL=https://api.rmaplastik.com/api`
4. API `.env`: `CLIENT_URL=https://www.rmaplastik.com`. CORS yalnızca bu adrese açıktır.
5. `/uploads` yine ana alan adında sembolik bağlantıyla sunulur; veritabanındaki görsel adresleri
   (`/uploads/...`) değişmez.

Admin oturumu `Authorization` başlığıyla taşındığı için çerez/CSRF ayarı gerekmez.

---

## 6. Görsel yüklemeleri (`/uploads`)

```bash
mkdir -p ~/rma-data/uploads
ln -s ~/rma-data/uploads ~/public_html/uploads     # bir kez
```
- `UPLOAD_DIR=/home/<kullanıcı>/rma-data/uploads`
- **Taşıma:** Mevcut görselleri (`server/uploads/products|posts|projects|gallery`) aynı klasör yapısıyla
  `~/rma-data/uploads/` altına kopyalayın. Veritabanındaki `/uploads/...` adresleri **değişmez**.
- **Dağıtımla ilişkisi:** Site ve API dağıtımları bu klasöre dokunmaz; sembolik bağlantı `public_html`
  içinde korunur.
- **Görseller nasıl sunulur:** Görselleri LiteSpeed doğrudan sunar, hızlıdır. Bağlantı çalışmazsa API de
  aynı klasörü `/uploads` üzerinden sunabilir.
- **Sembolik bağlantıya izin yoksa** ⚠️: `UPLOAD_DIR=/home/<kullanıcı>/public_html/uploads` yapın.
  Dağıtım `uploads` klasörünü yine korur. Bu durumda yedeğe `public_html/uploads` klasörünü ekleyin.

**Güvenlik:**
- Yalnızca JPG, PNG ve WEBP kabul edilir, en fazla 5 MB.
- Dosyanın **ilk baytları** bildirilen türle eşleşmezse dosya reddedilir ve silinir
  (örneğin `.png` adıyla yüklenen bir betik).
- Dosya adı her zaman rastgele bir UUID'dir; istekten hiçbir yol bilgisi kullanılmaz.
- Proforma PDF'leri yalnızca bellekte tutulur ve `%PDF-` imzası kontrol edilir.

**Disk yetersizse (S3 uyumlu depolama):** 15 GB SSD şu an yeterli görünüyor. Site derlemesi ~57 MB,
son 5 sürüm ~300 MB yer kaplar; görsel yüklemeleri bunun üstüne eklenir. Disk dolarsa:
- Cloudflare R2, Backblaze B2 veya AWS S3 gibi bir depolamaya geçilebilir. Bunun için
  `middleware/upload.js` içindeki `diskStorage`, S3'e yazan bir depolama ile değiştirilir ve
  `/uploads/*` adresi CDN'e yönlendirilir.
- Bu henüz uygulanmadı. Gerektiğinde ayrı bir geliştirme işidir; mevcut adresler bir
  yönlendirmeyle korunabilir.

---

## 7. İlk kurulum adımları (sırayla)

1. **SSH anahtarı** (bilgisayarınızda):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-rma" -f rma_deploy_key -N ""
   ```
   `rma_deploy_key.pub` içeriğini cPanel › SSH Access › Manage SSH Keys › Import Key ile ekleyip
   **Authorize** deyin.
2. **known_hosts:**
   ```bash
   ssh-keyscan -p <port> <sunucu>
   ```
   Çıktıyı `DEPLOY_KNOWN_HOSTS` secret'ına girin. Sunucuya bir kez SSH ile bağlanıp parmak izini
   firmanın verdiğiyle karşılaştırın.
3. **Klasörler:**
   ```bash
   mkdir -p ~/rma-app ~/rma-data/uploads ~/rma-deploy/incoming ~/rma-backups/db
   ln -s ~/rma-data/uploads ~/public_html/uploads
   ```
4. **Atlas** ([§3](#3-mongodb-atlas-kurulumu)) ve **GitHub secrets/variables** ([§8](#8-github-ayarları)).
5. **cPanel Node.js App** oluşturun ([§5.1](#51-uygulamayı-oluşturma-setup-nodejs-app--create-application)),
   ortam değişkenlerini girin.
6. **API kodu:** *Actions › Deploy API* ([§5.2](#52-kodu-yükleme-ve-bağımlılıkları-kurma)).
7. **Kontrol** (SSH):
   ```bash
   cd ~/rma-app/server && source ~/nodevenv/rma-app/server/22/bin/activate && npm run check-env -- --db --smtp
   ```
8. **İlk yönetici:** `.env` içine `ADMIN_NAME`, `ADMIN_EMAIL` ve `ADMIN_PASSWORD` girip
   `npm run create-admin` çalıştırın, sonra bu üç satırı silin. Diğer kullanıcılar panelden eklenir.
9. **Sağlık kontrolü:** `https://www.rmaplastik.com/api/health` →
   `{"status":"OK","database":"connected"}`.
10. **Site:** Panelde **Yayınla**'ya basın ya da *Actions › Publish site › Run workflow* çalıştırın.
11. Panelde *Ürün Grupları*, *Sektörler* ve *Ürün Tabloları* sayfalarındaki "içe aktar" düğmeleriyle
    hazır verileri veritabanına alın (yalnızca ilk kez).

---

## 8. GitHub ayarları

### 8.1 GitHub token (API için)

GitHub › Settings › Developer settings › **Fine-grained personal access tokens** › Generate new token:
- **Repository access:** *Only select repositories* → `emre317/rma-plastik-website`
- **Permissions:**
  - Repository permissions › **Actions: Read and write** (workflow başlatma ve durum okuma)
  - **Metadata: Read** (zorunlu)
  - Başka izin vermeyin.
- Süre: 1 yıl. Bitmeden yenileyin; süresi biterse panel "PUBLISH_GITHUB_TOKEN geçersiz" der.
- Token **yalnızca** API ortamında (`PUBLISH_GITHUB_TOKEN`) durur. Tarayıcıya ve repoya gitmez.

### 8.2 Secrets (Settings › Secrets and variables › Actions › **Secrets**)

| Secret | Açıklama |
|---|---|
| `CONTENT_API_TOKEN` | API'deki ile aynı değer |
| `PUBLISH_CALLBACK_TOKEN` | API'deki ile aynı değer |
| `DEPLOY_HOST` | SSH sunucu adı (cPanel'de yazar) |
| `DEPLOY_PORT` | SSH portu (ör. `22` veya firmanın verdiği port) |
| `DEPLOY_USER` | cPanel kullanıcı adı |
| `DEPLOY_SSH_KEY` | `rma_deploy_key` dosyasının **tamamı** (özel anahtar) |
| `DEPLOY_KNOWN_HOSTS` | `ssh-keyscan` çıktısı |
| `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` | Yalnızca `DEPLOY_METHOD=ftps` için |

**Önerilen:** Settings › Environments › **production** ortamı oluşturup secret'ları oraya koyun. Bütün
workflow'lar bu ortamı kullanır. İsterseniz *Deploy API* ve *Rollback site* için "Required reviewers"
ekleyebilirsiniz. *Publish site* için eklemeyin; yoksa paneldeki Yayınla onay beklemeye düşer.

### 8.3 Workflow'lar

| Dosya | Ne yapar | Nasıl başlar |
|---|---|---|
| `.github/workflows/publish-site.yml` | İçerik snapshot'ı → derleme → doğrulama → yükleme → canlı kontrol → panele bildirim | Panelde Yayınla; elle; `AUTO_DEPLOY_ON_PUSH=true` ise push |
| `.github/workflows/rollback-site.yml` | Hostingde saklanan önceki site sürümünü yayına alır | Elle (`release`: `previous` veya sürüm adı) |
| `.github/workflows/deploy-api.yml` | API kodunu kurar ve yeniden başlatır | Elle |
| `.github/workflows/ci.yml` | Her push/PR'da API testleri + site derlemesi (yayınlamaz) | Otomatik |

---

## 9. `.htaccess` ve sunucu davranışı

`client/public/.htaccess` derlemeyle birlikte `public_html/.htaccess` olarak yüklenir:

- **Yönlendirmeler:**
  - HTTP → HTTPS (proxy arkasında `X-Forwarded-Proto` da dikkate alınır).
  - `rmaplastik.com` → `www.rmaplastik.com`.
  - `.well-known` (SSL yenilemesi) muaftır.
- **Dokunulmayan yollar:** `/api`, `/uploads` ve `/.well-known` rewrite edilmez.
- **Sayfa adresleri:**
  - `/tr/products` adresi `/tr/products/index.html` dosyasından sunulur (`DirectorySlash Off`).
    Sonda `/` olan adrese yönlendirme yapılmaz; canonical adreslerle uyumludur.
  - `/admin`, `/admin/...` ve bilinmeyen adresler `index.html` (React uygulaması) ile açılır.
    Sayfa yenilemesi ve derin bağlantılar çalışır.
- **Önbellek:**
  - JS/CSS/font dosyaları 1 yıl `immutable` (adlarında içerik özeti olduğu için güvenlidir).
  - Görseller 7 gün.
  - HTML, JSON, XML ve TXT `no-cache`: yeni yayın hemen görünür.
- **Güvenlik başlıkları:** `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`,
  `Permissions-Policy`.
  - HSTS yorum satırında duruyor: HTTPS hem `www` hem çıplak alan adında sorunsuz çalıştıktan sonra açın.
  - CSP eklenmedi; GTM etiketleriyle çakışabilir ve ayrı test ister.
- `.htaccess`, `.git` ve `.env` dosyalarına erişim kapalıdır.

> cPanel `public_html/.htaccess` dosyasına satır eklerse (ör. PHP sürümü, LiteSpeed Cache) bir sonraki
> yayın bu satırları siler. Gerekli satırları `client/public/.htaccess` dosyasına ekleyin.
> Önceki dosyanın kopyası `~/rma-deploy/htaccess.before-<sürüm>` olarak saklanır.

### 9.3 SSH yoksa FTPS

`DEPLOY_METHOD=ftps` ve `FTP_HOST`/`FTP_USER`/`FTP_PASSWORD` secret'larıyla workflow `lftp` ile yükler:
1. Önce yeni `assets/` dosyaları gönderilir.
2. Sonra sayfalar gönderilir.
3. En son eski dosyalar silinir.

`api/`, `uploads`, `.well-known/` ve `cgi-bin/` korunur.

Kısıtları:
- Hostingde sürüm saklanmaz, dolayısıyla *Rollback site* çalışmaz. Geri almak için önceki commit'ten
  yeniden yayınlayın.
- API dağıtımı SSH gerektirir; FTPS ile cPanel'in **Run NPM Install** ve **Restart** düğmelerini kullanın.

---

## 10. Site yayınlama süreci

1. Yönetici panelde değişiklik yapar ve **Kaydet**'e basar. Değişiklik MongoDB'ye yazılır; site henüz değişmez.
2. **Yayınla** (rol: Yönetici veya İçerik):
   - API, MongoDB'de atomik bir **yayın kilidi** alır. İkinci bir istek "Bir yayınlama zaten sürüyor"
     (409) yanıtı alır.
   - Ardından GitHub'da `publish-site.yml` workflow'unu başlatır.
3. Workflow sırasıyla şunları yapar:
   1. `GET /api/content?publishId=…` (`CONTENT_API_TOKEN` ile). Snapshot yalnızca sitede gösterilen
      verileri içerir: yayınlanmış yazılar, açık ürünler, iletişim bilgileri. Proforma banka bilgileri,
      kullanıcılar ve teklifler snapshot'a **girmez**.
   2. `npm run build`: Vite + TR/EN/AR prerender + `sitemap.xml` + `robots.txt` + `build.json`.
   3. **Derleme kontrolü:** zorunlu dosyalar var mı, en az `MIN_PAGES` sayfa üretilmiş mi, sitemap doğru
      alan adını kullanıyor mu.
   4. **Yükleme:** paket `~/rma-deploy/releases/<sürüm>` altına açılır ve `public_html`'e üç adımda
      kopyalanır: yeni `assets` → sayfalar → eski dosyaların silinmesi. Açık sayfalar eski JS
      dosyalarını bulmaya devam eder.
   5. **Canlı kontrol:** `https://www.rmaplastik.com/build.json` yeni çalışmanın numarasını gösteriyor mu,
      `/tr/` ve `/en/products` açılıyor mu.
   6. Her aşamayı `/api/publish/callback` adresine bildirir (`PUBLISH_CALLBACK_TOKEN`).
4. **Paneldeki görünüm:**
   - Panel "Sırada / Site derleniyor / Sunucuya yükleniyor" adımlarını ve GitHub çalışma bağlantısını gösterir.
   - Hata olursa ayrımı ayrıca yazar: "derleme başarısız" mı, yoksa "derlendi ama yüklenemedi; eski
     site yayında" mı. Log'un son satırları da görünür; token'lar gizlenir.
   - Bildirimler ulaşmazsa panel durumu GitHub'dan kendisi okur.
   - 40 dakikada bitmeyen yayın "zaman aşımı" ile kapanır ve kilit açılır.
5. **`publishedAt`** yalnızca canlı kontrol geçtikten sonra güncellenir. Değer, içeriğin alındığı andır;
   derleme sırasında kaydedilen değişiklikler "yayınlanmamış" olarak görünmeye devam eder.

**Hata ve geri alma:**

| Durum | Sonuç |
|---|---|
| İçerik alınamadı, derleme ya da kontrol başarısız | Hostinge hiçbir şey gönderilmez |
| Yükleme yarıda kesildi | Eski sayfalar yeni `assets` ile çalışmaya devam eder; bir sonraki yayın ya da geri alma düzeltir |
| Eksik paket (`index.html`, `build.json` …) | Sunucudaki betik paketi reddeder ve siler; site değişmez |

---

## 11. Domain ve SSL

1. Alan adının DNS kayıtları (A/AAAA) hostingi göstermeli. `www` için CNAME veya A kaydı olmalı ⚠️.
   DNS değişikliğini yayına hazır olduğunuzda yapın.
2. cPanel › **SSL/TLS Status** › AutoSSL ile `rmaplastik.com` ve `www.rmaplastik.com` için sertifika alın.
   Alt alan adı kullanılıyorsa `api.rmaplastik.com` için de alın.
3. HTTPS çalışınca `.htaccess`'teki HSTS satırını açmayı düşünün.
4. Search Console'da `https://www.rmaplastik.com` mülkü + `sitemap.xml` (bkz. `docs/analytics-seo-setup.md`).

---

## 12. Yedekleme ve geri alma

### Veritabanı

- **Atlas M10+:** Backup › *Cloud Backup* açık olsun (günlük snapshot, point-in-time restore).
- **Atlas M0 veya ek güvence için:** hostingde gece çalışan bir cron (cPanel › Cron Jobs):
  ```
  15 3 * * * cd ~/rma-app/server && . ~/nodevenv/rma-app/server/22/bin/activate && BACKUP_KEEP=14 npm run backup-db >> ~/rma-backups/backup.log 2>&1
  ```
  - Her koleksiyon Extended JSON + gzip olarak `~/rma-backups/db/<tarih>/` altına yazılır; son 14
    yedek tutulur.
  - Haftada bir bu klasörü bilgisayarınıza indirin (sunucu dışında bir kopya şart).
  - Geri yükleme (bilgisayarda, MongoDB Database Tools ile):
    ```bash
    gunzip -c quoterequests.json.gz | mongoimport --uri "<URI>" --collection quoterequests --jsonArray
    ```
    Önce boş bir test veritabanına yükleyip kontrol edin; canlı veritabanını silmeyin.

### Görseller

```
30 3 * * * tar -czf ~/rma-backups/uploads-$(date +\%F).tar.gz -C ~/rma-data uploads && find ~/rma-backups -name 'uploads-*.tar.gz' -mtime +14 -delete
```

### Site

- *Actions › Rollback site › release: previous* önceki sürümü yayına alır (yalnızca SSH yöntemiyle).
  Belirli bir sürüm için `~/rma-deploy/releases` içindeki klasör adını yazın.
- Kod kaynaklı bir sorunda bir önceki commit'e dönüp yeniden **Publish site** de çalıştırılabilir.

### API

- `deploy-api.yml` her kurulumdan önce çalışan kodu `~/rma-deploy/api-releases/before-<sürüm>.tar.gz`
  olarak saklar. Geri almak için:
  ```bash
  cd ~/rma-app && tar -xzf ~/rma-deploy/api-releases/before-<sürüm>.tar.gz
  . ~/nodevenv/rma-app/server/22/bin/activate && cd server && npm ci --omit=dev && touch tmp/restart.txt
  ```
- `.env` ve yüklenen görseller bu işlemlerden etkilenmez.

---

## 13. Testler (canlıya geçmeden önce)

### Bu repoda otomatik çalışanlar (`cd server && npm test`, CI'da da çalışır)

- Görsel imza kontrolü ve reddedilen dosyanın silinmesi.
- Servis token'ları, snapshot ve callback erişim kontrolü.
- Üretim ortam değişkeni denetimi.
- Log ve adreslerde gizli bilgilerin maskelenmesi.
- `/api` önekli ve öneksiz yönlendirme, güvenlik başlıkları, CORS.
- Yetkisiz admin erişimi ve hatalı JSON yanıtları.
- Yayın akışı:
  - kilit;
  - aşamalar (derleme ve yükleme ayrımı);
  - `publishedAt`;
  - GitHub çalışma durumunun izlenmesi;
  - zaman aşımı;
  - yeniden başlatma sonrası kurtarma.
- Teklif kaydının SMTP olmadan da yapılması ve e-posta durumunun kaydı.

### Canlıda elle yapılacak kontrol listesi

- [ ] `https://www.rmaplastik.com/api/health` → `OK` / `connected`
- [ ] `/tr`, `/en`, `/ar` ana sayfaları; bir ürün, bir model ve bir sektör sayfası; sayfa yenileme
      (F5) ve sonda `/` olan/olmayan adresler
- [ ] `http://rmaplastik.com/tr/products` → `https://www.rmaplastik.com/tr/products` (301)
- [ ] `/admin` girişi, şifre sıfırlama e-postası (bağlantı `https://www.rmaplastik.com/admin/...` olmalı),
      kullanıcı daveti
- [ ] Teklif formu gönderimi: referans numarası, satış bildirimi, müşteri onay e-postası. Panelde
      teklif detayındaki **E-posta Durumu** kartı "Gönderildi" göstermeli
- [ ] SMTP şifresini geçici olarak bozun: teklif yine kaydedilmeli, kart "Gönderilemedi" ve **Yeniden
      Gönder** göstermeli
- [ ] Proforma PDF oluşturma ve gönderme
- [ ] Görsel yükleme ve görselin sitede görünmesi (`/uploads/...`)
- [ ] Panelde bir metni değiştirip **Yayınla**: adımlar, GitHub bağlantısı, "Site Güncel"
- [ ] Bilerek hatalı bir yayın (ör. `MIN_PAGES=9999`): panel "derleme başarısız" demeli, site değişmemeli
- [ ] *Rollback site* ile önceki sürüme dönüş ve tekrar yayın
- [ ] `robots.txt`, `sitemap.xml`, sayfa kaynağında canonical/hreflang, GTM ve çerez onayı

---

## 14. Sorun giderme

| Belirti | Olası neden / çözüm |
|---|---|
| `/api/...` 404 veya site HTML'i döndürüyor | Node.js App URL'si `/api` olarak kurulmamış ya da `public_html/api/.htaccess` silinmiş → cPanel'de uygulamayı yeniden kaydedin |
| `/api/health` 503, `database: connecting` | Atlas IP erişim listesi, kullanıcı/şifre, çıkış portu ⚠️ → `npm run check-env -- --db` |
| Uygulama hiç açılmıyor | cPanel'deki `stderr.log`/uygulama logunda `[env] …` hataları; başlangıç dosyası `passenger.cjs` mi? |
| `ERR_REQUIRE_ESM` / `ERR_REQUIRE_ASYNC_MODULE` | Startup file olarak `server.js` seçilmiş → `passenger.cjs` yapın |
| Panelde "PUBLISH_GITHUB_TOKEN geçersiz ya da Actions yazma izni yok" | Token süresi doldu ya da izin eksik ([§8.1](#81-github-token-api-için)) |
| Yayın "zaman aşımı" | Workflow sırada bekliyor ya da `production` ortamında onay bekliyor; Actions sekmesine bakın |
| Workflow "Missing configuration" | Eksik secret/variable adı log'da yazar |
| İçerik alınamadı (HTTP 401) | `CONTENT_API_TOKEN` API ile GitHub'da farklı |
| Canlı kontrol başarısız ("does not serve this build") | `DEPLOY_PATH` yanlış, önbellek (CDN) ya da `.htaccess` sorunu → `curl https://www.rmaplastik.com/build.json` |
| `/tr/products` 301 ile `/tr/products/`'a gidiyor | LiteSpeed `DirectorySlash Off` uygulamıyor ⚠️ → firmaya sorun; sayfalar yine açılır, yalnızca bir yönlendirme eklenir |
| Görseller 404 | `public_html/uploads` bağlantısı yok ya da `UPLOAD_DIR` farklı → `ls -l ~/public_html/uploads` |
| Giriş denemeleri hemen 429 | `TRUST_PROXY` yanlış: tüm istekler aynı IP görünüyor |
| E-posta gitmiyor | `npm run check-env -- --smtp`, `npm run mail-test -- adres@ornek.com`; panelde teklif detayındaki hata metni |
| Paylaşımlı hosting limiti (EP/NPROC/RAM) | `npm ci` sırasında hata → cPanel Resource Usage; `MONGODB_MAX_POOL` düşürün, firmadan limit isteyin |

---

## 15. Güvenlik özeti

- **Gizli bilgiler:**
  - Şifreler, token'lar ve bağlantı adresleri yalnızca API ortam değişkenlerinde ve GitHub secrets'ta durur.
  - `VITE_` değişkenlerinde gizli bilgi yoktur.
  - Yerel derleme (PUBLISH_MODE=local) bile alt sürece veritabanı, SMTP, JWT ve GitHub bilgilerini geçirmez.
- **Admin uç noktaları:**
  - JWT + rol kontrolü gerekir.
  - Yayınlama yalnızca Yönetici ve İçerik rollerine açıktır.
  - Callback ve snapshot ayrı token'larla korunur ve sabit sürede karşılaştırılır.
- **CORS ve proxy:**
  - CORS yalnızca `CLIENT_URL` adreslerine açıktır.
  - `trust proxy` = 1 olduğundan hız sınırları gerçek ziyaretçi IP'sini görür.
- **Hata yanıtları:** Hata mesajları iç ayrıntı içermez ("Internal server error."); ayrıntılar
  yalnızca sunucu loguna yazılır.
- **HTTP başlıkları:** API, Helmet başlıklarıyla ve üretimde HSTS ile yanıt verir; `X-Powered-By` gizlidir.
