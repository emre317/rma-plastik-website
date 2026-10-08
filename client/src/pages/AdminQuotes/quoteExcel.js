import { LANGUAGE_LABELS, quoteReference, statusLabel } from '../../components/admin/quoteStatus';

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
];

function quoteRow(quote) {
  const items = Array.isArray(quote.items) ? quote.items : [];
  const pieces = items.length ? items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) : quote.quantity || null;
  const notes = Array.isArray(quote.notes) ? quote.notes : [];
  const lastNote = notes[notes.length - 1];

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
    sheet('Durumlar', ['Durum', 'Talep'], report.byStatus.map((row) => [statusLabel(row.status), number(row.count)]), [22, 10]),
    sheet('Sorumlular', ['Sorumlu', 'Talep', 'Açık'], report.byAssignee.map((row) => [
      row.assignee || 'Atanmamış', number(row.count), number(row.open),
    ]), [24, 10, 10]),
  ]).toFile(`rma-satis-raporu-${stamp()}.xlsx`);
}
