/*
  Main export markets from the RMA Plastik 2025 brochure, nearest first.
  Markets saved in the admin panel (İhracat ağı) replace this list once
  published. Kept free of imports: the server reads it to import the defaults.
*/
const markets = [
  {
    code: 'BG',
    labelPosition: 'top',
    i18n: {
      tr: { name: 'Bulgaristan', region: 'Balkanlar' },
      en: { name: 'Bulgaria', region: 'Balkans' },
      ar: { name: 'بلغاريا', region: 'البلقان' },
    },
  },
  {
    code: 'EG',
    labelPosition: 'bottom',
    i18n: {
      tr: { name: 'Mısır', region: 'Kuzey Afrika' },
      en: { name: 'Egypt', region: 'North Africa' },
      ar: { name: 'مصر', region: 'شمال أفريقيا' },
    },
  },
  {
    code: 'NL',
    labelPosition: 'top',
    i18n: {
      tr: { name: 'Hollanda', region: 'Batı Avrupa' },
      en: { name: 'Netherlands', region: 'Western Europe' },
      ar: { name: 'هولندا', region: 'أوروبا الغربية' },
    },
  },
  {
    code: 'GB',
    labelPosition: 'left',
    i18n: {
      tr: { name: 'İngiltere', region: 'Batı Avrupa' },
      en: { name: 'United Kingdom', region: 'Western Europe' },
      ar: { name: 'المملكة المتحدة', region: 'أوروبا الغربية' },
    },
  },
  {
    code: 'US',
    labelPosition: 'top',
    i18n: {
      tr: { name: 'ABD', region: 'Kuzey Amerika' },
      en: { name: 'United States', region: 'North America' },
      ar: { name: 'الولايات المتحدة', region: 'أمريكا الشمالية' },
    },
  },
  {
    code: 'JP',
    labelPosition: 'top',
    i18n: {
      tr: { name: 'Japonya', region: 'Uzak Doğu' },
      en: { name: 'Japan', region: 'Far East' },
      ar: { name: 'اليابان', region: 'الشرق الأقصى' },
    },
  },
];

export default markets;
