/*
  KVKK texts of the website, word for word from "RMA Plastik – KVKK
  Dokümantasyon Seti (Revize 2)", AYA Hukuk, 03.11.2026. Change them only
  with a new text from the lawyer; then raise the version here and, for the
  consent boxes, in server/services/consents.js (TEXT_VERSIONS).
  Turkish only for now; the English and Arabic pages show this text with a
  note until the lawyer's translations arrive.
*/

export const VERSION_LINE = 'Son güncelleme: 03.11.2026 – Sürüm 1.0';

const CONTROLLER = 'RMA Yatırım Makina İnşaat Sanayi ve Ticaret Limited Şirketi';
const ADDRESS = 'Nacarlı OSB, Cumhuriyet Cd. No: 22, Akdeniz/Mersin';

export const privacyNotice = {
  title: 'Web Sitesi Formları Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni',
  blocks: [
    { type: 'h2', text: '1. Veri Sorumlusu' },
    { type: 'p', text: `6698 sayılı Kişisel Verilerin Korunması Kanunu (“Kanun”) uyarınca, www.rmaplastik.com internet sitesindeki formlar aracılığıyla elde edilen kişisel verileriniz veri sorumlusu sıfatıyla ${CONTROLLER} (“RMA Plastik” veya “Şirket”) tarafından aşağıda açıklanan kapsamda işlenmektedir.` },
    {
      type: 'table',
      head: ['Bilgi', 'Değer'],
      rows: [
        ['Unvan', CONTROLLER],
        ['Adres', ADDRESS],
        ['MERSİS No', '0735022512900029'],
        ['KEP adresi', 'rma@hs03.kep.tr'],
        ['KVKK başvuruları için e-posta', 'muhasebe@rmaplastik.com'],
        ['Genel iletişim', 'info@rmaplastik.com | +90 (324) 676 45 00'],
      ],
    },

    { type: 'h2', text: '2. Bu Metnin Kapsamı' },
    { type: 'p', text: 'Bu metin, internet sitemizdeki Teklif Formu (Bölüm 3) ve Katalog İndirme Formu (Bölüm 4), formlara eklenen ziyaret kaynağı bilgileri (Bölüm 5) ve formlarda isteğe bağlı olarak verebileceğiniz pazarlama izinlerini kapsar. Çerezler ve benzeri teknolojiler hakkında ayrıntılı bilgi Çerez Politikası’nda yer almaktadır.', cookieLink: true },

    { type: 'h2', id: 'teklif-formu', text: '3. Teklif Formu' },
    { type: 'p', text: 'Teklif formunda firma adı, ad soyad, e-posta ve telefon alanlarının doldurulması zorunludur; bu bilgiler olmadan talebinizi değerlendirip size teklif iletemeyiz. Diğer alanlar ve pazarlama izinleri isteğe bağlıdır.' },
    {
      type: 'table',
      head: ['Veri kategorisi', 'İşlenen veriler', 'İşleme amacı', 'Hukuki sebep'],
      rows: [
        ['Kimlik', 'Ad soyad', 'Teklif talebinizin alınması, değerlendirilmesi, teklifin hazırlanması ve size iletilmesi; talebinizle ve ileride ortaya çıkabilecek benzer ihtiyaçlarınızla ilgili sizinle iletişim kurulması', 'Talebi kendi adınıza yapıyorsanız: bir sözleşmenin kurulmasıyla doğrudan ilgili olması (m. 5/2-c).\nTalebi bir firma adına yapıyorsanız: Şirketimizin meşru menfaati (m. 5/2-f).'],
        ['İletişim', 'E-posta adresi, telefon numarası; paylaşmanız hâlinde ülke, teslimat ili ve açık adres', 'Yukarıdaki amaçlar; teslimat ve nakliye koşullarının hesaplanması', 'Yukarıdakiyle aynı'],
        ['Müşteri işlem', 'Firma adı; ürün grubu, model/kapasite, miktar, depolanacak ürün, yoğunluk, sıcaklık, ölçü ve özel tasarım bilgileri, ek ihtiyaçlar ve mesajınız', 'Talebe uygun ürünün belirlenmesi, fiyat ve teslim süresinin hesaplanması; talep istatistiklerinin oluşturulması ve ürün ve hizmetlerimizin geliştirilmesi', 'Yukarıdakiyle aynı; istatistik ve geliştirme amaçları için Şirketimizin meşru menfaati (m. 5/2-f)'],
        ['Talep ve yazışma kayıtları', 'Talep tarihi, talebin gönderildiği sayfa, talebinizin bir kopyasını içeren bilgilendirme e-postası ve sonraki yazışmalar', 'Talebin kayıt altına alınması; olası uyuşmazlıklarda ispat', 'Bir hakkın tesisi, kullanılması veya korunması için zorunlu olması (m. 5/2-e)'],
        ['Pazarlama', 'E-posta, telefon; ad soyad, firma ve ülke', 'Yalnızca Kutu A ve Kutu B’yi işaretlemeniz hâlinde: seçtiğiniz kanaldan (e-posta, SMS, arama) yeni ürün, kampanya ve duyurulara ilişkin ileti gönderilmesi', 'Açık rızanız (m. 5/1) ve 6563 sayılı Kanun kapsamındaki onayınız'],
        ['Pazarlama', 'E-posta adresi ve telefon numarasının kriptografik özeti (hash)', 'Yalnızca Kutu C’yi işaretlemeniz hâlinde: Google ve Meta reklamlarının sonuçlarının ölçülmesi, reklam eşleştirmesi, yeniden pazarlama ve hedef kitle oluşturulması', 'Açık rızanız (m. 5/1)'],
        ['İzin kayıtları', 'Onay/ret tarihi ve saati, onay metninin sürümü, onayın alındığı form ve kanal', 'İzinlerin ispatı; İleti Yönetim Sistemi (İYS) yükümlülüklerinin yerine getirilmesi; ret vermiş kişilere ileti gönderilmesinin önlenmesi', 'Hukuki yükümlülüğün yerine getirilmesi (m. 5/2-ç); Şirketimizin meşru menfaati (m. 5/2-f)'],
      ],
    },

    { type: 'h2', id: 'katalog-formu', text: '4. Katalog İndirme Formu' },
    { type: 'p', text: 'Katalog indirme formunda yalnızca e-posta adresi zorunludur. Ad soyad, firma ve ülke bilgileri ile pazarlama izinleri isteğe bağlıdır; izin vermeseniz de kataloğu indirebilirsiniz.' },
    {
      type: 'table',
      head: ['Veri kategorisi', 'İşlenen veriler', 'İşleme amacı', 'Hukuki sebep'],
      rows: [
        ['İletişim', 'E-posta adresi', 'Katalog talebinin kayıt altına alınması; kataloğa hangi firma ve pazarlardan ilgi gösterildiğinin değerlendirilmesi; otomatik veya sahte kayıtların önlenmesi', 'Şirketimizin meşru menfaati (m. 5/2-f)'],
        ['Kimlik / Müşteri işlem', 'Paylaşmanız hâlinde ad soyad, firma adı, ülke', 'Yukarıdaki amaçlar; formda firma adı belirttiyseniz, kataloğa gösterdiğiniz ilgiyle bağlantılı olarak satış ekibimizin firmanızla iletişime geçmesi', 'Şirketimizin meşru menfaati (m. 5/2-f)'],
        ['Pazarlama', 'E-posta adresi; paylaşmışsanız ad soyad, firma ve ülke', 'Yalnızca Kutu A ve Kutu B’yi işaretlemeniz hâlinde: yeni ürün, kampanya ve duyurulara ilişkin e-posta gönderilmesi', 'Açık rızanız (m. 5/1) ve 6563 sayılı Kanun kapsamındaki onayınız'],
        ['Pazarlama', 'E-posta adresinin kriptografik özeti (hash)', 'Yalnızca Kutu C’yi işaretlemeniz hâlinde: Google ve Meta reklamlarının sonuçlarının ölçülmesi, reklam eşleştirmesi, yeniden pazarlama ve hedef kitle oluşturulması', 'Açık rızanız (m. 5/1)'],
        ['İzin kayıtları', 'Onay/ret tarihi ve saati, onay metninin sürümü, onayın alındığı form', 'İzinlerin ispatı; İYS yükümlülükleri; ret vermiş kişilere ileti gönderilmesinin önlenmesi', 'Hukuki yükümlülüğün yerine getirilmesi (m. 5/2-ç); meşru menfaat (m. 5/2-f)'],
      ],
    },
    { type: 'p', text: 'Kampanya ve tanıtım iletileri yalnızca onay vermeniz hâlinde gönderilir. Satış ekibimizin firmanızla iletişime geçmesini istemiyorsanız, ilk iletişimde veya info@rmaplastik.com adresine yazarak bunu bildirebilirsiniz.' },

    { type: 'h2', id: 'ziyaret-kaynagi', text: '5. Ziyaret Kaynağı Bilgileri (Her İki Form)' },
    { type: 'p', text: 'Çerez tercihlerinizde Analiz çerezlerine izin vermişseniz, siteye hangi internet sitesinden ve hangi kampanya etiketiyle (UTM parametreleri) geldiğiniz ile giriş yaptığınız sayfa; Pazarlama çerezlerine izin vermişseniz ayrıca reklam tıklama kimliği (Google Ads “gclid”, Meta “fbclid”) form kaydınıza eklenir. Bu bilgiler, reklam ve iletişim kanallarımızın hangi taleplere yol açtığını ölçmek ve reklam bütçemizi yönetmek amacıyla açık rızanıza (m. 5/1) dayanılarak işlenir. İzin vermediyseniz bu bilgiler kaydedilmez; yalnızca formu gönderdiğiniz sayfa bilgisi kaydedilir.' },

    { type: 'h2', text: '6. Cihazınızda Saklanan Form Bilgileri' },
    { type: 'p', text: 'Teklif formunda “Bilgilerimi bu cihazda hatırla” seçeneğini işaretlerseniz, firma adı, ad soyad, e-posta, telefon ve ülke bilgileriniz bir sonraki talebinizde formu yeniden doldurmanız gerekmemesi için yalnızca kendi tarayıcınızda saklanır. Seçeneğin işaretini kaldırarak veya tarayıcı verilerini silerek bu bilgileri istediğiniz zaman silebilirsiniz.' },

    { type: 'h2', text: '7. Kişisel Verilerin Toplanma Yöntemi' },
    { type: 'p', text: 'Kişisel verileriniz, internet sitemizdeki formları doldurup göndermeniz, sonraki yazışmalarımız ve (izin vermeniz hâlinde) çerezler ve benzeri teknolojiler aracılığıyla, elektronik ortamda kısmen otomatik yollarla toplanır. Hukuki sebepler yukarıdaki tablolarda her işleme faaliyeti için ayrıca belirtilmiştir.' },

    { type: 'h2', text: '8. Kişisel Verilerin Aktarılması' },
    { type: 'p', text: 'Kişisel verileriniz, yukarıdaki amaçlarla sınırlı olarak aşağıdaki alıcılara aktarılır:' },
    {
      type: 'table',
      head: ['Alıcı', 'Rolü', 'Aktarılan veriler', 'Konum ve aktarım dayanağı'],
      rows: [
        ['MongoDB, Inc. (MongoDB Atlas)', 'Veri işleyen – form kayıtlarının tutulduğu veritabanı hizmeti', 'Her iki formdaki veriler, izin kayıtları ve ziyaret kaynağı bilgileri', 'Kanun m. 9 uyarınca'],
        ['E-posta hizmet sağlayıcısı (Uzman Posta)', 'Veri işleyen – e-posta hizmeti', 'Teklif talebinin info@rmaplastik.com adresine ve size gönderilen bilgilendirme e-postası; yazışmalar', 'Yurt içi'],
        ['Google LLC ve bağlı şirketleri', 'Analiz ve reklam hizmeti sağlayıcısı', 'Yalnızca izin vermeniz hâlinde: çerez ve çevrim içi tanımlayıcılar, ziyaret ve etkileşim verileri, reklam tıklama kimliği; Kutu C’yi işaretlemişseniz e-posta ve telefon hash’i', 'ABD ve diğer ülkeler; Kanun m. 9 uyarınca'],
        ['Meta Platforms Ireland Limited ve bağlı şirketleri', 'Reklam hizmeti sağlayıcısı (Facebook, Instagram)', 'Yalnızca izin vermeniz hâlinde: çerez ve çevrim içi tanımlayıcılar, site etkileşimleri, reklam tıklama kimliği; Kutu C’yi işaretlemişseniz e-posta ve telefon hash’i', 'İrlanda, ABD ve diğer ülkeler; Kanun m. 9 uyarınca'],
        ['Yetkili kamu kurum ve kuruluşları, mahkemeler', 'Kanuni yetkiye dayalı talepler; uyuşmazlıklar', 'Talep edilen veriler', 'Yurt içi; m. 8/2 ve m. 5/2 (ç) ve (e)'],
        ['Hukuk ve mali müşavirlerimiz', 'Hukuki ve mali danışmanlık', 'Uyuşmazlık veya denetim için gerekli veriler', 'Yurt içi; m. 5/2 (e) ve (f)'],
      ],
    },

    { type: 'h2', text: '9. Saklama Süresi ve İmha' },
    { type: 'p', text: 'Kişisel verileriniz aşağıdaki süreler boyunca saklanır; sürenin sonunda silinir, yok edilir veya anonim hâle getirilir. Bu süreler, veritabanı kayıtları ile info@rmaplastik.com e-posta kutusundaki talep e-postaları için aynıdır. Anonim hâle getirilen veriler istatistik amacıyla süresiz kullanılabilir.' },
    {
      type: 'table',
      head: ['Kayıt', 'Saklama süresi'],
      rows: [
        ['Teklif talebi (siparişe/sözleşmeye dönüşmeyen)', 'Son yazışma veya işlem tarihinden itibaren 3 yıl'],
        ['Siparişe/sözleşmeye dönüşen teklif talebi', 'Talebe ilişkin bilgiler ticari defter ve belgelerin bir parçası hâline gelir ve 6102 sayılı TTK m. 82 uyarınca 10 yıl saklanır'],
        ['Katalog talebi (pazarlama onayı yok)', 'Kayıt veya son yazışma tarihinden itibaren 2 yıl'],
        ['Pazarlama onayı verilen iletişim bilgileri', 'Onay geri alınıncaya kadar'],
        ['Onay ve ret kayıtları', 'Onayın geçerliliğinin sona ermesinden itibaren 3 yıl (Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik)'],
        ['Ret listesi (yalnızca e-posta/telefon ve ret tarihi)', 'Tekrar ileti gönderilmesini önlemek amacıyla, Şirketimizin ticari ileti gönderim faaliyeti sürdüğü müddetçe'],
        ['Ziyaret kaynağı bilgileri', 'Eklendiği form kaydıyla aynı süre'],
        ['Veritabanı yedekleri', 'En fazla 90 gün'],
        ['Çerezler', 'Çerez Politikası’ndaki tabloda belirtilen süreler'],
      ],
    },

    { type: 'h2', text: '10. Kanun’un 11. Maddesi Kapsamındaki Haklarınız' },
    { type: 'p', text: 'Kanun’un 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, Kanun’un 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme, düzeltme ve silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme ve kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz. Verdiğiniz açık rıza ve onayları dilediğiniz zaman geri alabilirsiniz; geri alma, önceki işlemlerin hukuka uygunluğunu etkilemez.' },

    { type: 'h2', id: 'basvuru', text: '11. Başvuru Yolu' },
    { type: 'p', text: 'Haklarınıza ilişkin taleplerinizi, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ’e uygun olarak, kimliğinizi tespit edici bilgilerle birlikte:' },
    {
      type: 'ul',
      items: [
        `Islak imzalı dilekçe ile ${ADDRESS} adresine şahsen veya noter aracılığıyla,`,
        'Güvenli elektronik imza veya mobil imza ile rma@hs03.kep.tr KEP adresine,',
        'Daha önce Şirketimize bildirdiğiniz ve sistemimizde kayıtlı bulunan e-posta adresinizden muhasebe@rmaplastik.com adresine',
      ],
    },
    { type: 'p', text: 'iletebilirsiniz. Başvurunuz, niteliğine göre en kısa sürede ve en geç 30 gün içinde ücretsiz olarak sonuçlandırılır; işlemin ayrıca bir maliyet gerektirmesi hâlinde Kişisel Verileri Koruma Kurulu’nca belirlenen tarifedeki ücret alınabilir.' },

    { type: 'h2', text: '12. Güncellemeler' },
    { type: 'p', text: `Bu metin gerektiğinde güncellenir; güncel sürüm internet sitemizde yayımlanır. ${VERSION_LINE}` },
  ],
};

// Consent texts behind the form boxes (KVKK set, sections 3–5)
export const consentTexts = [
  {
    id: 'pazarlama-acik-riza',
    title: 'Pazarlama Amaçlı Kişisel Veri İşleme Açık Rıza Metni (Kutu A)',
    version: 'A-v1.0',
    paragraphs: [
      `${CONTROLLER} (“RMA Plastik”) tarafından; ürün, hizmet, kampanya, yenilik ve duyurulara ilişkin tanıtım ve pazarlama faaliyetlerinin yürütülmesi, bu kapsamda tarafıma ileti gönderilmesi, ilgi alanlarıma ve talep geçmişime uygun içerik ve teklif sunulabilmesi ve bu amaçla müşteri profili ve segmentasyon çalışmaları yapılması amacıyla; formda paylaştığım iletişim bilgilerimin (e-posta, varsa telefon), ad soyad, firma ve ülke bilgilerimin ve talep ve ilgi bilgilerimin (talep ettiğim ürünler, katalog talebim, ziyaret kaynağı) işlenmesine açık rıza veriyorum.`,
      'Bu kapsamda verilerimin RMA Plastik’in e-posta ve veritabanı hizmet sağlayıcılarına, Web Sitesi Formları Aydınlatma Metni’nde belirtilen şekilde aktarılabileceğini biliyorum. Bu rızanın isteğe bağlı olduğunu, vermememin katalog indirmeme veya teklif almama engel olmadığını ve rızamı dilediğim zaman, gönderilen her iletideki ret bağlantısı veya Aydınlatma Metni’ndeki başvuru kanalları aracılığıyla geri alabileceğimi biliyorum.',
    ],
  },
  {
    id: 'ticari-ileti-onayi',
    title: 'Ticari Elektronik İleti Onay Metni (Kutu B)',
    version: 'B-v1.0',
    paragraphs: [
      `${CONTROLLER} tarafından ürün, hizmet, kampanya, yenilik ve duyurulara ilişkin ticari elektronik iletilerin, formda seçtiğim kanal veya kanallar (e-posta, SMS, telefon araması) üzerinden tarafıma gönderilmesine onay veriyorum. Onayımı dilediğim zaman, gönderilen iletilerdeki ret bağlantısı, İleti Yönetim Sistemi (İYS) veya info@rmaplastik.com adresi üzerinden ücretsiz olarak geri alabileceğimi biliyorum.`,
    ],
  },
  {
    id: 'reklam-eslestirme-acik-riza',
    title: 'Reklam Platformlarıyla Eşleştirme Açık Rıza Metni (Kutu C)',
    version: 'C-v1.0',
    paragraphs: [
      `${CONTROLLER} (“RMA Plastik”) tarafından; reklamların hangi taleplere yol açtığının ölçülmesi, reklam kampanyalarının performansının değerlendirilmesi, reklam eşleştirmesi yapılması, tarafıma yeniden reklam gösterilmesi (yeniden pazarlama) ve hedef kitle ile benzer kitle oluşturulması amaçlarıyla; formda paylaştığım e-posta adresimin ve paylaşmışsam telefon numaramın tek yönlü kriptografik yöntemle (SHA-256) özetlenmiş (hash) hâlinin, ilgili form kaydına ait tarih ve dönüşüm bilgisiyle birlikte Google LLC ve bağlı şirketleri ile Meta Platforms Ireland Limited ve bağlı şirketlerine aktarılmasına ve bu şirketlerin reklam hizmetleri aracılığıyla bu amaçlarla işlenmesine açık rıza veriyorum.`,
      // The lawyer's draft leaves the transfer mechanism to be filled in (set, 0.3/1)
      'Hash yönteminin verilerimi anonim hâle getirmediğini, Google ve Meta’nın bu özeti kendi kullanıcı kayıtlarıyla eşleştirebileceğini; bu şirketlerin sunucularının ABD, İrlanda ve başka ülkelerde bulunduğunu ve aktarımın Kanun’un 9. maddesine uygun olarak yapıldığını biliyorum. Bu rızanın isteğe bağlı olduğunu, vermememin katalog indirmeme veya teklif almama engel olmadığını ve rızamı dilediğim zaman Aydınlatma Metni’ndeki başvuru kanalları aracılığıyla geri alabileceğimi biliyorum.',
    ],
  },
];

export const cookiePolicy = {
  title: 'Çerez Politikası',
  blocks: [
    { type: 'h2', text: '1. Veri Sorumlusu' },
    { type: 'p', text: `Bu Çerez Politikası, www.rmaplastik.com internet sitesinde kullanılan çerezler ve benzeri teknolojiler hakkında, veri sorumlusu sıfatıyla ${CONTROLLER} (“RMA Plastik”) tarafından hazırlanmıştır. İletişim ve başvuru bilgileri Web Sitesi Formları Aydınlatma Metni’nde yer almaktadır.`, noticeLink: true },

    { type: 'h2', text: '2. Çerez ve Benzeri Teknolojiler' },
    { type: 'p', text: 'Çerezler, ziyaret ettiğiniz internet sitesi tarafından tarayıcınız aracılığıyla cihazınıza kaydedilen küçük metin dosyalarıdır. Sitemizde çerezlerin yanı sıra tarayıcının yerel depolama (localStorage) ve oturum depolama (sessionStorage) alanları ile reklam pikselleri de kullanılmaktadır; bu Politika’da hepsi birlikte “çerez” olarak anılmaktadır.' },

    { type: 'h2', text: '3. Hukuki Sebep ve Tercihleriniz' },
    { type: 'p', text: 'Zorunlu çerezler, sitenin çalışması ve sizin talep ettiğiniz işlevlerin sunulması için gereklidir ve Şirketimizin meşru menfaatine (m. 5/2-f) dayanılarak kullanılır. Analiz ve Pazarlama çerezleri ise yalnızca çerez penceresinde açık rızanızı (m. 5/1) vermeniz hâlinde etkinleştirilir; izin vermeden önce ilgili Google ve Meta etiketleri yüklenmez ve bu şirketlere veri gönderilmez.' },
    { type: 'p', text: 'Çerez penceresinde “Tümünü kabul et”, “Tümünü reddet” ve “Tercihleri yönet” seçenekleri eşit şekilde sunulur. Tercihinizi dilediğiniz zaman sayfanın altındaki “Çerez tercihleri” bağlantısından değiştirebilirsiniz. İzninizi geri aldığınızda ilgili çerezler cihazınızdan silinir. Tercihiniz 12 ay boyunca hatırlanır; bu sürenin sonunda veya bu Politika önemli ölçüde değiştiğinde tercihiniz yeniden sorulur.', settingsButton: true },

    { type: 'h2', text: '4. Kullanılan Çerezler' },
    { type: 'h3', text: '4.1 Zorunlu ve işlevsel (izin gerekmez)' },
    {
      type: 'table',
      head: ['Ad', 'Sağlayıcı / tür', 'Amaç', 'Süre'],
      rows: [
        ['rma_consent', 'RMA Plastik / yerel depolama', 'Çerez tercihlerinizi saklar', '12 ay'],
        ['rma_quote_cart', 'RMA Plastik / yerel depolama', 'Teklif sepetinize eklediğiniz ürünleri saklar', 'Siz silene veya teklif gönderilene kadar'],
        ['rma_compare', 'RMA Plastik / yerel depolama', 'Karşılaştırmaya eklediğiniz ürünleri saklar', 'Siz silene kadar'],
        ['rma_quote_contact', 'RMA Plastik / yerel depolama', 'Yalnızca “Bilgilerimi bu cihazda hatırla” seçeneğini işaretlerseniz iletişim bilgilerinizi saklar', 'Seçeneği kaldırana veya tarayıcı verilerini silene kadar'],
        ['rma_catalog_lead', 'RMA Plastik / yerel depolama', 'Kataloğu daha önce indirdiğinizi hatırlar, formun tekrar gösterilmesini önler', '24 ay'],
        ['rma_admin_token, rma_admin_user', 'RMA Plastik / yerel depolama', 'Yalnızca yetkili personelin yönetim paneli oturumu; ziyaretçiler için kullanılmaz', 'Oturum sonuna kadar'],
      ],
    },
    { type: 'h3', text: '4.2 Analiz (yalnızca izin verirseniz)' },
    {
      type: 'table',
      head: ['Ad', 'Sağlayıcı / tür', 'Amaç', 'Süre'],
      rows: [
        ['_ga', 'Google Analytics 4 / çerez', 'Ziyaretçileri ayırt ederek ziyaret istatistiklerinin ölçülmesi', '2 yıl'],
        ['_ga_15MEPYKQ44', 'Google Analytics 4 / çerez', 'Oturum durumunun saklanması', '2 yıl'],
        ['rma_visit', 'RMA Plastik / oturum depolama', 'Giriş sayfası, yönlendiren site ve kampanya etiketlerinin (UTM) form kaydına eklenmesi', 'Sekme kapanınca silinir'],
        ['rma_source', 'RMA Plastik / yerel depolama', 'Ziyaret kaynağı bilgisinin sonraki ziyaretlerde de forma eklenebilmesi', '90 gün'],
      ],
    },
    { type: 'h3', text: '4.3 Pazarlama (yalnızca izin verirseniz)' },
    {
      type: 'table',
      head: ['Ad', 'Sağlayıcı / tür', 'Amaç', 'Süre'],
      rows: [
        ['_gcl_au', 'Google Ads / çerez', 'Reklam tıklamaları ile site üzerindeki dönüşümlerin (ör. teklif talebi) eşleştirilmesi', '90 gün'],
        ['_gcl_aw', 'Google Ads / çerez', 'Google reklamına tıklayarak gelmeniz hâlinde tıklama bilgisinin saklanması', '90 gün'],
        ['_gcl_ls', 'Google Ads / yerel depolama', 'Dönüşüm ölçümüne ilişkin teknik bilgiler', '90 gün'],
        ['_fbp', 'Meta Pixel / çerez', 'Ziyaretçinin ayırt edilmesi; Facebook ve Instagram reklamlarının ölçümü ve yeniden pazarlama', '90 gün'],
        ['_fbc', 'Meta Pixel / çerez', 'Meta reklamına tıklayarak gelmeniz hâlinde tıklama bilgisinin (fbclid) saklanması', '90 gün'],
        ['Tıklama kimlikleri (gclid, fbclid)', 'RMA Plastik / oturum ve yerel depolama', 'Reklam tıklama kimliğinin form kaydına eklenmesi', 'rma_visit / rma_source ile aynı'],
        ['Google ve Meta alan adlarındaki çerezler', 'Google, Meta', 'Reklam ölçümü, kişiselleştirme ve yeniden pazarlama', 'İlgili sağlayıcı tarafından belirlenir'],
      ],
    },
    { type: 'h3', text: '4.4 Harita ve video içerikleri' },
    { type: 'p', text: 'İletişim sayfasındaki Google Haritalar ve sitedeki YouTube videoları, siz “Haritayı yükle” veya oynat düğmesine tıklayana kadar yüklenmez; bunların yerine sitemizde barındırılan bir önizleme görseli gösterilir. Tıkladığınızda içerik Google/YouTube sunucularından yüklenir ve bu sırada IP adresiniz ve tarayıcı bilgileriniz Google’a iletilir; Google kendi çerezlerini kullanabilir. Videolar, çerez kullanımını sınırlayan youtube-nocookie.com alan adı üzerinden gösterilir.' },

    { type: 'h2', text: '5. İşlenen Veriler' },
    { type: 'p', text: 'İzin verdiğiniz çerez türlerine göre; IP adresi, cihaz ve tarayıcı bilgileri, yaklaşık konum, ziyaret edilen sayfalar ve site içi etkileşimler, yönlendiren site, kampanya etiketleri, reklam tıklama kimlikleri ve çerez tercih kayıtları işlenebilir.' },

    { type: 'h2', text: '6. Aktarım' },
    { type: 'p', text: 'Analiz ve pazarlama çerezleri aracılığıyla toplanan veriler, izin vermeniz hâlinde Google LLC ve bağlı şirketleri ile Meta Platforms Ireland Limited ve bağlı şirketlerine aktarılır. Bu şirketlerin sunucuları ABD, İrlanda ve başka ülkelerde bulunduğundan bu aktarım yurt dışına aktarım niteliğindedir ve Kanun’un 9. maddesi uyarınca gerçekleştirilir.' },

    { type: 'h2', text: '7. Tarayıcı Ayarları' },
    { type: 'p', text: 'Çerezleri tarayıcınızın ayarlarından da silebilir veya engelleyebilirsiniz. Zorunlu çerezlerin engellenmesi hâlinde teklif sepeti ve karşılaştırma gibi bazı işlevler çalışmayabilir.' },

    { type: 'h2', text: '8. Haklarınız' },
    { type: 'p', text: `Kanun’un 11. maddesindeki haklarınızı, Web Sitesi Formları Aydınlatma Metni’nin “Başvuru Yolu” bölümünde belirtilen kanallardan kullanabilirsiniz. ${VERSION_LINE}`, noticeLink: true },
  ],
};
