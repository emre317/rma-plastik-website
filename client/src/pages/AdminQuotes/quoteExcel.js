import {
  LANGUAGE_LABELS, lossReasonLabel, outcomeLabel, quoteReference, statusLabel,
} from '../../components/admin/quoteStatus';
import { offerTotals } from '../../data/offerText';

/*
  Excel files of the quote requests (list export) and of the sales report.
  The library is loaded only when a download button is used.
*/

const bold = (value) => ({ value, fontWeight: 'bold', backgroundColor: '#E2E7F2' });

// Excel has no time zones: dates are written as Istanbul wall-clock time (UTC+3, no DST)
const date = (value, format = 'dd.mm.yyyy hh:mm') =>
  value ? { value: new Date(new Date(value).getTime() + 3 * 3600 * 1000), type: Date, format } : null;

const text = (value) => (value === null || value === undefined || value === '' ? null : String(value));

const longText = (value) => (text(value) ? { value: String(value), wrap: true } : null);

const stamp = () => new Date().toISOString().slice(0, 10);

async function writer() {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  return writeExcelFile;
}

const COLUMNS = [
  ['Referans', 14],
  ['Tarih', 17],
  ['Durum', 16],
  ['Firma', 28],
  ['Yetkili', 22],
  ['E-posta', 28],
  ['Telefon', 18],
  ['Ülke', 16],
  ['Ürün / konu', 30],
  ['Ürünler (adet)', 44],
  ['Toplam adet', 12],
  ['Kapasite', 14],
  ['Uygulama', 24],
  ['Mesaj', 60],
  ['Site dili', 11],
  ['Sorumlu', 18],
  ['Takip tarihi', 13],
  ['Son not', 50],
  ['Not sayısı', 10],
  ['Sonuç', 12],
  ['Kayıp nedeni', 20],
  ['Sonuç notu', 36],
  ['Proforma tutarı (KDV hariç)', 18],
  ['Para birimi', 10],
  ['Kanal', 18],
  ['Kampanya', 22],
  ['utm_source / medium', 22],
  ['İlk sayfa', 32],
  ['Geldiği site', 28],
];

function quoteRow(quote) {
  const items = Array.isArray(quote.items) ? quote.items : [];
  const pieces = items.length ? items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) : quote.quantity || null;
  const notes = Array.isArray(quote.notes) ? quote.notes : [];
  const lastNote = notes[notes.length - 1];
  const offer = quote.offer?.lines?.length ? quote.offer : null;
  const source = quote.attribution;

  return [
    quoteReference(quote._id),
    date(quote.createdAt),
    statusLabel(quote.status),
    text(quote.company),
    text(quote.name),
    text(quote.email),
    text(quote.phone),
    text(quote.country),
    text(quote.product) || 'Genel Talep',
    longText(items.map((item) => `${item.name} × ${item.quantity || 1}`).join('\n')),
    pieces ? { value: Number(pieces), type: Number } : null,
    text(quote.capacity),
    text(quote.application),
    longText(quote.message),
    text(LANGUAGE_LABELS[quote.language] || quote.language),
    text(quote.assignee),
    date(quote.followUpAt, 'dd.mm.yyyy'),
    text(lastNote ? `${lastNote.text}${lastNote.author ? ` (${lastNote.author})` : ''}` : ''),
    notes.length ? { value: notes.length, type: Number } : null,
    text(outcomeLabel(quote.outcome)),
    text(lossReasonLabel(quote.lossReason)),
    longText(quote.outcomeNote),
    offer ? { value: offerTotals(offer).subtotal, type: Number, format: '#,##0.00' } : null,
    offer ? text(offer.currency) : null,
    text(source?.channel || 'Doğrudan'),
    text(source?.utmCampaign),
    text([source?.utmSource, source?.utmMedium].filter(Boolean).join(' / ')),
    text(source?.landingPage),
    text(source?.referrer),
  ];
}

export async function exportQuotesFile(quotes) {
  const writeExcelFile = await writer();

  await writeExcelFile([
    {
      sheet: 'Talepler',
      data: [COLUMNS.map(([label]) => bold(label)), ...quotes.map(quoteRow)],
      columns: COLUMNS.map(([, width]) => ({ width })),
      stickyRowsCount: 1,
    },
  ]).toFile(`rma-teklif-talepleri-${stamp()}.xlsx`);

  return quotes.length;
}

/* Sales report: one sheet per breakdown */
export async function exportReportFile(report, { rangeLabel, monthLabel }) {
  const writeExcelFile = await writer();
  const number = (value) => ({ value: Number(value) || 0, type: Number });
  const money = (value) => ({ value: Number(value) || 0, type: Number, format: '#,##0.00' });
  const percent = (part, whole) => ({ value: whole ? part / whole : 0, type: Number, format: '0%' });

  const sheet = (name, header, rows, widths) => ({
    sheet: name,
    data: [header.map(bold), ...rows],
    columns: widths.map((width) => ({ width })),
    stickyRowsCount: 1,
  });

  await writeExcelFile([
    sheet('Özet', ['Rapor', 'Değer'], [
      ['Dönem', rangeLabel],
      ['Toplam talep', number(report.total)],
      ['Teklif verilen / kapanan', number(report.quotedTotal)],
      ['Teklife dönüşme oranı', percent(report.quotedTotal, report.total)],
      ['Kazanılan', number(report.won)],
      ['Kaybedilen', number(report.lost)],
      ['Kazanma oranı (sonuçlananlar)', percent(report.won, report.won + report.lost)],
      ['Ülke sayısı', number(report.byCountry.filter((row) => row.country !== 'Belirtilmemiş').length)],
    ], [32, 24]),
    sheet('Aylık', ['Ay', 'Talep', 'Teklif verilen / kapanan', 'Oran'], report.byMonth.map((row) => [
      monthLabel(row.month), number(row.count), number(row.quoted), percent(row.quoted, row.count),
    ]), [18, 10, 24, 10]),
    sheet('Ülkeler', ['Ülke', 'Talep', 'Pay'], report.byCountry.map((row) => [
      row.country, number(row.count), percent(row.count, report.total),
    ]), [26, 10, 10]),
    sheet('Ürünler', ['Ürün / model', 'Talep', 'Toplam adet'], report.byProduct.map((row) => [
      row.name, number(row.requests), number(row.pieces),
    ]), [44, 10, 14]),
    sheet('Proforma tutarları', ['Para birimi', 'Proforma', 'Gönderilen', 'Teklif edilen (KDV hariç)', 'Ortalama', 'Kazanılan adet', 'Kazanılan tutar', 'Kaybedilen adet', 'Kaybedilen tutar'], report.byCurrency.map((row) => [
      row.currency, number(row.offers), number(row.sent), money(row.offered), money(row.average), number(row.won), money(row.wonValue), number(row.lost), money(row.lostValue),
    ]), [12, 10, 12, 22, 16, 14, 18, 14, 18]),
    sheet('Kayıp nedenleri', ['Neden', 'Talep', 'Pay'], report.byLossReason.map((row) => [
      lossReasonLabel(row.reason) || 'Belirtilmemiş', number(row.count), percent(row.count, report.lost),
    ]), [28, 10, 10]),
    sheet('Kanallar', ['Kanal', 'Talep', 'Teklif verilen / kapanan', 'Kazanılan', 'Pay'], report.byChannel.map((row) => [
      row.channel, number(row.count), number(row.quoted), number(row.won), percent(row.count, report.total),
    ]), [24, 10, 24, 12, 10]),
    sheet('Kampanyalar', ['Kampanya', 'Kaynak', 'Talep', 'Kazanılan'], report.byCampaign.map((row) => [
      row.campaign, text(row.source), number(row.count), number(row.won),
    ]), [30, 18, 10, 12]),
    sheet('Giriş sayfaları', ['Sayfa', 'Talep'], report.byLanding.map((row) => [row.page, number(row.count)]), [44, 10]),
    sheet('Durumlar', ['Durum', 'Talep'], report.byStatus.map((row) => [statusLabel(row.status), number(row.count)]), [22, 10]),
    sheet('Sorumlular', ['Sorumlu', 'Talep', 'Açık'], report.byAssignee.map((row) => [
      row.assignee || 'Atanmamış', number(row.count), number(row.open),
    ]), [24, 10, 10]),
  ]).toFile(`rma-satis-raporu-${stamp()}.xlsx`);
}

/* Catalogue downloads (potential customers) */
export async function exportLeadsFile(leads) {
  const writeExcelFile = await writer();
  const columns = [
    ['E-posta', 30], ['Ad soyad', 22], ['Firma', 26], ['Ülke', 16], ['Site dili', 11], ['E-posta izni', 12], ['İzin tarihi', 13],
    ['İlk indirme', 17], ['Son indirme', 17], ['İndirme', 9], ['Teklif talebi', 12], ['Kanal', 18], ['Kampanya', 22], ['İlk sayfa', 32], ['Geldiği site', 28],
  ];

  const rows = leads.map((lead) => [
    text(lead.email),
    text(lead.name),
    text(lead.company),
    text(lead.country),
    text(LANGUAGE_LABELS[lead.language] || lead.language),
    lead.marketingConsent ? 'Evet' : 'Hayır',
    date(lead.consentAt, 'dd.mm.yyyy'),
    date(lead.createdAt),
    date(lead.lastDownloadAt),
    { value: Number(lead.downloads) || 1, type: Number },
    { value: Number(lead.quotes) || 0, type: Number },
    text(lead.attribution?.channel || 'Doğrudan'),
    text(lead.attribution?.utmCampaign),
    text(lead.attribution?.landingPage),
    text(lead.attribution?.referrer),
  ]);

  await writeExcelFile([
    {
      sheet: 'Potansiyel müşteriler',
      data: [columns.map(([label]) => bold(label)), ...rows],
      columns: columns.map(([, width]) => ({ width })),
      stickyRowsCount: 1,
    },
  ]).toFile(`rma-potansiyel-musteriler-${stamp()}.xlsx`);

  return leads.length;
}
