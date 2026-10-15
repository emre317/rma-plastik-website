import { COUNTRY_CODES } from './countries';

/*
  Lists behind the quote form: which product groups are tanks, what is
  stored in them, the follow-up needs, Turkish provinces and phone codes.
  Keys are stored with the request; labels are in contact.* of the locales.
*/

// Portfolio groups (data/productPortfolio.js) that hold a liquid or bulk product
export const TANK_GROUPS = ['vertical', 'horizontal', 'twoLayer', 'silo', 'treatment', 'food', 'fuel'];

// What will be stored. `detail`: ask the product name / concentration;
// `properties`: 'hidden' (water), 'optional' or 'required' (density and temperature)
export const STORED_PRODUCTS = [
  { key: 'water', properties: 'hidden' },
  { key: 'drinking', properties: 'hidden' },
  { key: 'acid', detail: true, properties: 'required' },
  { key: 'caustic', detail: true, properties: 'required' },
  { key: 'adblue', properties: 'optional' },
  { key: 'fuel', detail: true, properties: 'optional' },
  { key: 'food', detail: true, properties: 'optional' },
  { key: 'other', detail: true, detailRequired: true, properties: 'required' },
];

export const storedProduct = (key) => STORED_PRODUCTS.find((item) => item.key === key) || null;

// What the customer already has for a custom part
export const DESIGN_INPUTS = ['drawing', 'sample', 'idea'];

// Click-to-add needs (replace most of the free text)
export const QUOTE_NEEDS = ['fittings', 'color', 'installation', 'shipping', 'urgent'];

// The 81 provinces of Türkiye
export const TR_PROVINCES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir',
  'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas',
  'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat',
  'Zonguldak',
];

// International dialling codes of the markets the site is most used from
// (other countries simply start with an empty phone field)
export const DIAL_CODES = {
  TR: '90', AE: '971', SA: '966', QA: '974', KW: '965', BH: '973', OM: '968', IQ: '964', IR: '98', JO: '962',
  LB: '961', SY: '963', IL: '972', PS: '970', EG: '20', LY: '218', TN: '216', DZ: '213', MA: '212', SD: '249',
  YE: '967', AZ: '994', GE: '995', AM: '374', KZ: '7', RU: '7', UA: '380', BY: '375', MD: '373', RO: '40',
  BG: '359', GR: '30', CY: '357', MK: '389', AL: '355', RS: '381', ME: '382', BA: '387', HR: '385', SI: '386',
  HU: '36', SK: '421', CZ: '420', PL: '48', DE: '49', AT: '43', CH: '41', IT: '39', FR: '33', ES: '34',
  PT: '351', NL: '31', BE: '32', LU: '352', GB: '44', IE: '353', DK: '45', SE: '46', NO: '47', FI: '358',
  IS: '354', EE: '372', LV: '371', LT: '370', US: '1', CA: '1', MX: '52', BR: '55', AR: '54', CL: '56',
  CO: '57', PE: '51', VE: '58', CN: '86', JP: '81', KR: '82', IN: '91', PK: '92', BD: '880', AF: '93',
  TM: '993', UZ: '998', KG: '996', TJ: '992', MN: '976', ID: '62', MY: '60', SG: '65', TH: '66', VN: '84',
  PH: '63', AU: '61', NZ: '64', ZA: '27', NG: '234', KE: '254', ET: '251', GH: '233', TZ: '255', UG: '256',
  SN: '221', CI: '225', CM: '237', SO: '252', DJ: '253', MR: '222', ML: '223', NE: '227', TD: '235', ER: '291',
  RW: '250',
};

// "+90 " for a country, '' when unknown
export const dialPrefix = (code) => (DIAL_CODES[code] ? `+${DIAL_CODES[code]} ` : '');

// A phone field that holds only a country code (safe to replace)
export const isBarePrefix = (value) => !value || /^\+\d{1,4}\s*$/.test(value.trim());

const TIME_ZONES = {
  'Europe/Istanbul': 'TR', 'Asia/Istanbul': 'TR', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM', 'Asia/Baghdad': 'IQ', 'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB', 'Africa/Cairo': 'EG', 'Asia/Baku': 'AZ', 'Asia/Tbilisi': 'GE',
};

/* Best guess of the visitor's country: time zone, then browser language, then site language */
export function guessCountry(siteLanguage) {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIME_ZONES[zone]) return TIME_ZONES[zone];
  } catch {
    // No Intl time zone: fall through
  }

  const languages = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
  for (const language of languages) {
    const region = String(language || '').split('-')[1]?.toUpperCase();
    if (region && COUNTRY_CODES.includes(region)) return region;
  }

  return siteLanguage === 'tr' ? 'TR' : '';
}
