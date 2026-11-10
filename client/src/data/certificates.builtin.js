/*
  RMA Plastik management system certificates (BelCert, ILAS accredited), as
  printed on the certificates. Certificates saved in the admin panel
  (Sertifikalar) replace this list once published. Kept free of imports:
  the server reads it to import the defaults.
  Dates are YYYY-MM-DD.
*/
const SCOPE = {
  tr: 'Polietilenden depo, tank, tekne, kano, fıçı ve benzeri kapların imalatı ve plastik işleme teknikleri kullanarak (rotasyon, şişirme, enjeksiyon) plastik ürünlerin ve aksesuarlarının üretimi, satışı ve sonrası hizmetleri.',
  // As printed on the certificates
  en: 'Production of warehouses, tanks, boats, canoes, barrels and similar containers made of polyethylene and production, sale and after-services of plastic products and accessories using plastic processing techniques (rotation, blowing, injection).',
  ar: 'تصنيع الخزانات والصهاريج والقوارب والزوارق والبراميل والحاويات المماثلة من البولي إيثيلين، وإنتاج وبيع المنتجات البلاستيكية وملحقاتها وخدمات ما بعد البيع باستخدام تقنيات معالجة البلاستيك (القولبة الدورانية، النفخ، الحقن).',
};

const COMMON = {
  holder: 'RMA Yatırım Makina İnş. San. ve Tic. Ltd. Şti.',
  issuer: 'BelCert Uluslararası Belgelendirme',
  accreditation: 'ILAS (ILAS-MS-0089)',
  verifyUrl: 'https://www.belcert.com',
};

const certificates = [
  {
    ...COMMON,
    code: 'ISO 9001:2015',
    category: 'quality',
    number: 'A1803532',
    issuedAt: '2026-07-04',
    validUntil: '2027-07-04',
    file: '/documents/certificates/rma-plastik-iso-9001.pdf',
    image: '/images/certificates/rma-plastik-iso-9001.webp',
    i18n: {
      tr: { title: 'Kalite Yönetim Sistemi', scope: SCOPE.tr },
      en: { title: 'Quality Management System', scope: SCOPE.en },
      ar: { title: 'نظام إدارة الجودة', scope: SCOPE.ar },
    },
  },
  {
    ...COMMON,
    code: 'ISO 14001:2015',
    category: 'environment',
    number: 'A1803534',
    issuedAt: '2026-08-26',
    validUntil: '2027-08-26',
    file: '/documents/certificates/rma-plastik-iso-14001.pdf',
    image: '/images/certificates/rma-plastik-iso-14001.webp',
    i18n: {
      tr: { title: 'Çevre Yönetim Sistemi', scope: SCOPE.tr },
      en: { title: 'Environmental Management System', scope: SCOPE.en },
      ar: { title: 'نظام الإدارة البيئية', scope: SCOPE.ar },
    },
  },
  {
    ...COMMON,
    code: 'ISO 45001:2018',
    category: 'safety',
    number: 'A1803535',
    issuedAt: '2026-08-26',
    validUntil: '2027-08-26',
    file: '/documents/certificates/rma-plastik-iso-45001.pdf',
    image: '/images/certificates/rma-plastik-iso-45001.webp',
    i18n: {
      tr: { title: 'İş Sağlığı ve Güvenliği Yönetim Sistemi', scope: SCOPE.tr },
      en: { title: 'Occupational Health and Safety Management System', scope: SCOPE.en },
      ar: { title: 'نظام إدارة الصحة والسلامة المهنية', scope: SCOPE.ar },
    },
  },
  {
    ...COMMON,
    code: 'ISO 10002:2018',
    category: 'customer',
    number: 'A1803533',
    issuedAt: '2026-08-26',
    validUntil: '2027-08-26',
    file: '/documents/certificates/rma-plastik-iso-10002.pdf',
    image: '/images/certificates/rma-plastik-iso-10002.webp',
    i18n: {
      tr: { title: 'Müşteri Memnuniyeti ve Şikâyetleri Yönetim Sistemi', scope: '' },
      en: { title: 'Customer Satisfaction and Complaints Management System', scope: '' },
      ar: { title: 'نظام إدارة رضا العملاء والشكاوى', scope: '' },
    },
  },
];

export const CERTIFICATE_CATEGORIES = ['quality', 'environment', 'safety', 'customer', 'product', 'other'];

export default certificates;
