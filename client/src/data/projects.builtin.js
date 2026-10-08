/*
  Custom molding reference projects from the RMA Plastik 2025 brochure (p. 4).
  Projects saved in the admin panel (Referans projeler) replace this list once
  published. Kept free of imports: the server reads it to import the defaults.
*/
const projects = [
  {
    image: '/images/custom-molding/drone.webp',
    i18n: {
      tr: { client: 'Baibars Mekatronik Havacılık', title: 'Drone tarım ilaçlama deposu' },
      en: { client: 'Baibars Mechatronics Aviation', title: 'Agricultural spraying drone tank' },
      ar: { client: 'Baibars Mekatronik Havacılık', title: 'خزان رش زراعي للطائرات المسيّرة' },
    },
  },
  {
    image: '/images/custom-molding/cabin-bin.webp',
    i18n: {
      tr: { client: 'TCI Cabin Interior', title: 'Uçak içi yanmaz çöp kovası' },
      en: { client: 'TCI Cabin Interior', title: 'Fire-resistant aircraft cabin waste bin' },
      ar: { client: 'TCI Cabin Interior', title: 'سلة نفايات مقاومة للحريق لمقصورة الطائرات' },
    },
  },
  {
    image: '/images/custom-molding/train-tank.webp',
    i18n: {
      tr: { client: 'Alstom', title: 'Tren akıllı tuvalet pis ve temiz su tankları' },
      en: { client: 'Alstom', title: 'Waste and fresh water tanks for smart train toilets' },
      ar: { client: 'Alstom', title: 'خزانات المياه النظيفة والعادمة لمراحيض القطارات الذكية' },
    },
  },
  {
    image: '/images/custom-molding/floating-pier.webp',
    i18n: {
      tr: { client: 'İTÜ Uçak ve Uzay Bilimleri Fakültesi', title: 'Büyükçekmece Gölü üzerinde güneş paneli yüzer iskelesi' },
      en: { client: 'ITU Faculty of Aeronautics and Astronautics', title: 'Floating solar panel pier on Lake Büyükçekmece' },
      ar: { client: 'كلية علوم الطيران والفضاء بجامعة إسطنبول التقنية', title: 'رصيف عائم لألواح الطاقة الشمسية على بحيرة بويوك تشكمجه' },
    },
  },
];

export default projects;
