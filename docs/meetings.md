# Toplantı Talepleri (yüz yüze / online Teams)

Ziyaretçi, sitenin sağ alt köşesindeki iletişim baloncuklarından **Toplantı Talep Edin**
(kırmızı takvim simgesi) ile 3 adımda toplantı ister:

1. **Tür:** Yüz yüze (fabrikada) veya Online (Microsoft Teams)
2. **Gün ve saat:** Hafta içi, 09:00–17:00 arası, 30 dakikalık aralıklarla; saatler Türkiye
   saatidir, ziyaretçinin kendi saati altında küçük yazıyla görünür. En erken 2 saat sonrası,
   en geç 90 gün sonrası seçilebilir.
3. **Konu ve iletişim:** Konu (ürün bilgisi, teklif, özel üretim, fabrika ziyareti, bayilik,
   diğer) + başlık, firma, ad soyad, e-posta, telefon, ülke ve mesaj. Online toplantıda
   müşterinin ekibinden en fazla 10 katılımcı (ad + e-posta) eklenebilir.

Bu değerler `client/src/data/meetingForm.js` dosyasındadır (iş günleri, ilk/son saat,
aralık, en fazla katılımcı); hem form hem API bu dosyayı kullanır.

## Talep geldiğinde

- Kayıt veritabanına düşer (**Yönetim paneli → Satış → Toplantılar**, menüde bekleyen sayısı).
- `MEETING_NOTIFY_TO` adresine (ayarlı değilse `QUOTE_NOTIFY_TO`, o da yoksa
  **info@rmaplastik.com**) bildirim e-postası gider; “Yanıtla” müşteriye gider.
- Müşteriye site dilinde (TR/EN/AR) “talebiniz alındı” e-postası gider
  (`QUOTE_CONFIRM_CUSTOMER=false` ile kapanır).

## Panelde onay / revize

Toplantıyı açın, sağdaki **Onayla** kartında:

| | Yüz yüze | Online |
| --- | --- | --- |
| Tarih, saat, süre | değiştirilebilir (müşteriye “farklı saat” notu düşer) | değiştirilebilir |
| RMA katılımcıları | görüşecek çalışan(lar) | toplantıya katılacaklar |
| Ek | görüşme yeri (varsayılan fabrika adresi) | Teams bağlantısı (otomatik ya da yapıştırılır) |
| Müşteriye not | isteğe bağlı | isteğe bağlı |

Çalışanlar panel kullanıcılarından seçilir; panel hesabı olmayan biri ad + e-posta ile eklenebilir.

**Onayla ve davet gönder** dediğinizde:

- Müşteriye (online ise katılımcıları Cc’de) onay e-postası: tarih/saat, süre, yer ya da
  “Teams toplantısına katıl” düğmesi, RMA katılımcıları ve takvim daveti (`.ics`).
- Seçilen RMA çalışanlarına müşteri bilgileri, iç not ve takvim daveti.
- Davet Outlook, Gmail, Apple Takvim ve Teams’te “Kabul et” düğmesiyle açılır; kişi kabul
  ettiğinde takvimine eklenir.

Sonradan yapılan her değişiklik (saat, katılımcı, yer, bağlantı) **Kaydet ve bildir** ile
herkese “güncellendi” e-postası ve takvim güncellemesi olarak gider (aynı takvim kaydı
güncellenir, ikinci kayıt oluşmaz). Toplantıdan çıkarılan çalışana iptal gider.
**Reddet / İptal et** müşteriye (ve onaylanmışsa çalışanlara) nedeniyle birlikte bildirim
gönderir ve takvim kaydını siler.

## Hatırlatma e-postası

Onaylı her toplantıdan **24 saat önce** (`MEETING_REMINDER_HOURS`) müşteriye (online ise
katılımcıları Cc’de) site dilinde, RMA katılımcılarına Türkçe hatırlatma gider: tarih/saat,
yer ve yol tarifi ya da “Teams toplantısına katıl” düğmesi. Takvim daveti yeniden eklenmez.

- Her başlangıç saati için bir kez gönderilir; saat değiştirilirse yeni saate göre yeniden gider.
- Onay / değişiklik e-postası 6 saatten kısa süre önce gittiyse bekler (ör. sabah onaylanan
  ertesi günkü toplantının hatırlatması akşama kalır); başlamasına 30 dakikadan az kalan
  toplantıya gönderilmez.
- Toplantı detayında “Hatırlatma” satırı ne zaman gideceğini ya da gittiğini gösterir;
  gönderim sonucu “E-postalar” kartında görünür.
- `MEETING_REMINDERS=false` ile kapanır.

API çalışırken hatırlatmaları 15 dakikada bir kendisi kontrol eder. Paylaşımlı hostingde
Passenger boşta kalan uygulamayı durdurabildiği için cPanel › **Cron Jobs**’a şunu da ekleyin
(aynı toplantı iki kez hatırlatılmaz):

```
*/15 * * * * cd ~/rma-app/server && . ~/nodevenv/rma-app/server/22/bin/activate && npm run meeting-reminders >> ~/rma-backups/reminders.log 2>&1
```

Panelin üstündeki şerit yaklaşan onaylı toplantıları (“36 dk sonra · Firma · Online”) ve
onay bekleyen talep sayısını gösterir; başlamasına 15 dakika kalan online toplantıda
**Katıl** düğmesi çıkar.

## Microsoft Teams bağlantısı

### A) Elle (varsayılan, ek ayar gerekmez)

Online toplantıda panel **Teams’te toplantı oluştur** düğmesi gösterir: Teams’in yeni toplantı
formu konu, saat ve tüm katılımcılar dolu olarak açılır. Kaydedince Teams herkese kendi
davetini gönderir; **Bağlantıyı kopyala** ile alınan bağlantıyı paneldeki alana yapıştırıp
onaylayın. Siteden giden e-postalarda bu bağlantı ve takvim daveti yer alır.

### B) Otomatik (Microsoft 365 + Microsoft Graph)

Şirketin Microsoft 365 / Teams lisansı varsa, onayla düğmesi Teams toplantısını kendisi oluşturur:

1. **Azure Portal → Microsoft Entra ID → Uygulama kayıtları → Yeni kayıt** (ör. “RMA Web Toplantı”).
2. **API izinleri → Microsoft Graph → Uygulama izinleri → `Calendars.ReadWrite`** ekleyin ve
   **Yönetici onayı verin**.
3. **Sertifikalar ve gizli diziler → Yeni gizli dizi**; değerini kopyalayın.
4. Güvenlik için uygulamanın erişimini yalnızca organizatör posta kutusuyla sınırlayın
   (Exchange Online “RBAC for Applications” ya da Application Access Policy).
5. Sunucudaki `server/.env` dosyasına ekleyin ve uygulamayı yeniden başlatın:

   ```
   MS_GRAPH_TENANT_ID=<Dizin (kiracı) kimliği>
   MS_GRAPH_CLIENT_ID=<Uygulama (istemci) kimliği>
   MS_GRAPH_CLIENT_SECRET=<gizli dizi değeri>
   TEAMS_ORGANIZER=toplanti@rmaplastik.com   # Teams lisanslı bir M365 posta kutusu
   ```

6. `cd server && npm run check-env` çıktısında `Teams (Graph): on` görünmelidir.

Bu durumda toplantı organizatörün takviminde Teams bağlantısıyla oluşturulur; Microsoft
müşteriye, katılımcılara ve RMA çalışanlarına takvim davetini kendisi gönderir (site ayrıca
`.ics` eklemez, çift kayıt olmaz). Saat değişince aynı toplantı güncellenir, iptal edilince
Teams toplantısı iptal edilir. Graph hata verirse panel nedenini gösterir ve bağlantıyı elle
yapıştırma yolu açık kalır.

## KVKK

Form yalnızca toplantıyı planlamak için gereken bilgileri ister ve KVKK aydınlatma metnine
bağlantı verir; pazarlama izni kutusu yoktur. Kayıtlar teklif talepleriyle aynı kuralla
(3 yıl, `server/services/retention.js`) otomatik silinir; yönetici rolü kaydı elle silebilir.
**Aydınlatma metninde (/kvkk) “toplantı talep formu” için bir bölüm henüz yok; hukuk
onayıyla eklenmesi önerilir.**
