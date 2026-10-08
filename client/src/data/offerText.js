/*
  Commercial offer (Teklif) texts and totals, shared by the admin offer
  document (PDF) and the server e-mail. Kept free of imports: the server
  reads this file too.
*/

export const OFFER_CURRENCIES = ['TRY', 'USD', 'EUR'];

export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

// Latin digits also on the Arabic document (prices, dates)
export const OFFER_LOCALES = { tr: 'tr-TR', en: 'en-GB', ar: 'ar-u-nu-latn' };

export const OFFER_TEXT = {
  tr: {
    title: 'Fiyat teklifi',
    number: 'Teklif no',
    date: 'Tarih',
    validUntil: 'Geçerlilik',
    reference: 'Talep no',
    to: 'Sayın',
    preparedBy: 'Hazırlayan',
    item: 'Ürün',
    qty: 'Miktar',
    unitPrice: 'Birim fiyat',
    discount: 'İsk.',
    amount: 'Tutar',
    subtotal: 'Ara toplam',
    vat: 'KDV',
    total: 'Genel toplam',
    conditions: 'Ticari koşullar',
    incoterm: 'Teslim şekli',
    deliveryPlace: 'Teslim yeri',
    deliveryTime: 'Teslim süresi',
    payment: 'Ödeme',
    notes: 'Notlar',
    terms: 'Genel koşullar',
    bank: 'Banka bilgileri',
    unit: 'adet',
    contact: 'İletişim',
    emailSubject: (number) => `RMA Plastik fiyat teklifi – ${number}`,
    emailGreeting: (name) => `Sayın ${name},`,
    emailIntro: (reference) => `${reference} numaralı talebiniz için hazırladığımız fiyat teklifini ekte PDF olarak bulabilirsiniz. Teklifin özeti aşağıdadır.`,
    emailReply: 'Sorularınız veya değişiklik talepleriniz için bu e-postayı yanıtlayabilirsiniz.',
    emailAttachment: 'Teklif belgesi (PDF) ektedir.',
  },
  en: {
    title: 'Quotation',
    number: 'Quotation no.',
    date: 'Date',
    validUntil: 'Valid until',
    reference: 'Request ref.',
    to: 'To',
    preparedBy: 'Prepared by',
    item: 'Item',
    qty: 'Qty',
    unitPrice: 'Unit price',
    discount: 'Disc.',
    amount: 'Amount',
    subtotal: 'Subtotal',
    vat: 'VAT',
    total: 'Total',
    conditions: 'Commercial terms',
    incoterm: 'Incoterm',
    deliveryPlace: 'Delivery place',
    deliveryTime: 'Lead time',
    payment: 'Payment',
    notes: 'Notes',
    terms: 'General terms',
    bank: 'Bank details',
    unit: 'pcs',
    contact: 'Contact',
    emailSubject: (number) => `RMA Plastik quotation – ${number}`,
    emailGreeting: (name) => `Dear ${name},`,
    emailIntro: (reference) => `Please find attached our quotation (PDF) for your request ${reference}. A summary is given below.`,
    emailReply: 'If you have any questions or would like changes, simply reply to this email.',
    emailAttachment: 'The quotation document (PDF) is attached.',
  },
  ar: {
    dir: 'rtl',
    title: 'عرض سعر',
    number: 'رقم العرض',
    date: 'التاريخ',
    validUntil: 'صالح حتى',
    reference: 'رقم الطلب',
    to: 'إلى',
    preparedBy: 'أعدّه',
    item: 'المنتج',
    qty: 'الكمية',
    unitPrice: 'سعر الوحدة',
    discount: 'خصم',
    amount: 'المبلغ',
    subtotal: 'المجموع الفرعي',
    vat: 'ضريبة القيمة المضافة',
    total: 'الإجمالي',
    conditions: 'الشروط التجارية',
    incoterm: 'شروط التسليم',
    deliveryPlace: 'مكان التسليم',
    deliveryTime: 'مدة التسليم',
    payment: 'الدفع',
    notes: 'ملاحظات',
    terms: 'الشروط العامة',
    bank: 'البيانات المصرفية',
    unit: 'قطعة',
    contact: 'التواصل',
    emailSubject: (number) => `عرض سعر من RMA Plastik – ${number}`,
    emailGreeting: (name) => `السيد/السيدة ${name}،`,
    emailIntro: (reference) => `تجدون مرفقاً عرض السعر (PDF) الخاص بطلبكم رقم ${reference}. وفيما يلي ملخص العرض.`,
    emailReply: 'لأي استفسار أو طلب تعديل، يمكنكم الرد على هذا البريد الإلكتروني.',
    emailAttachment: 'وثيقة العرض (PDF) مرفقة.',
  },
};

export const offerCopy = (lang) => OFFER_TEXT[lang] || OFFER_TEXT.tr;

export const offerNumber = (quoteId, revision = 1) => `RMA-${String(quoteId || '').slice(-6).toUpperCase()}-R${revision || 1}`;

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

/* Line amounts, subtotal, VAT and total (rounded to cents) */
export function offerTotals(offer) {
  const lines = (offer?.lines || []).map((line) => {
    const gross = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
    return round(gross * (1 - (Number(line.discount) || 0) / 100));
  });

  const subtotal = round(lines.reduce((sum, value) => sum + value, 0));
  const hasVat = offer?.vatRate !== null && offer?.vatRate !== undefined && offer?.vatRate !== '';
  const vat = hasVat ? round((subtotal * Number(offer.vatRate)) / 100) : 0;

  return { lines, subtotal, hasVat, vat, total: round(subtotal + vat) };
}

export function formatMoney(value, currency, lang) {
  try {
    return new Intl.NumberFormat(OFFER_LOCALES[lang] || 'tr-TR', { style: 'currency', currency: currency || 'TRY' }).format(Number(value) || 0);
  } catch {
    return `${(Number(value) || 0).toFixed(2)} ${currency || ''}`;
  }
}

export function formatOfferDate(value, lang) {
  if (!value) return '';
  return new Intl.DateTimeFormat(OFFER_LOCALES[lang] || 'tr-TR', { dateStyle: 'long', timeZone: 'Europe/Istanbul' }).format(new Date(value));
}
