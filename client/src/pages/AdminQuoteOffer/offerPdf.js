/*
  Turns the rendered offer document into an A4 PDF in the browser.
  The page is drawn as an image (so Turkish and Arabic text look exactly as on
  screen) and split into A4 pages at rows or blocks, never through a line.
  Libraries are loaded only when a PDF is made.
*/

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 12;

export async function makeOfferPdf(element) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);

  if (document.fonts?.ready) await document.fonts.ready;

  const scale = 2;
  const canvas = await html2canvas(element, { scale, backgroundColor: '#ffffff', useCORS: true, logging: false });

  // CSS px per mm of the printable width
  const cssWidth = element.offsetWidth;
  const pxPerMm = cssWidth / A4_WIDTH_MM;
  // The document's own padding is the top margin of page 1; later pages get MARGIN_MM on top
  const firstPageCss = (A4_HEIGHT_MM - MARGIN_MM) * pxPerMm;
  const pageCss = (A4_HEIGHT_MM - MARGIN_MM * 2) * pxPerMm;

  // Safe break points: the top of every row/block (in CSS px from the top)
  const top = element.getBoundingClientRect().top;
  const breaks = [...element.querySelectorAll('[data-break]')]
    .map((node) => node.getBoundingClientRect().top - top)
    .filter((y) => y > 0)
    .sort((a, b) => a - b);

  const slices = [];
  let start = 0;
  const totalCss = canvas.height / scale;

  while (start < totalCss - 1) {
    const room = slices.length ? pageCss : firstPageCss;
    let end = start + room;

    if (end < totalCss) {
      const candidates = breaks.filter((y) => y > start + room * 0.4 && y <= end);
      if (candidates.length) end = candidates[candidates.length - 1];
    } else {
      end = totalCss;
    }

    slices.push([start, end]);
    start = end;
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const contentWidthMm = A4_WIDTH_MM;

  slices.forEach(([from, to], index) => {
    if (index) pdf.addPage();

    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.ceil((to - from) * scale);
    const context = slice.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(canvas, 0, Math.floor(from * scale), canvas.width, slice.height, 0, 0, canvas.width, slice.height);

    const heightMm = (to - from) / pxPerMm;
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, index ? MARGIN_MM : 0, contentWidthMm, heightMm);

    if (slices.length > 1) {
      pdf.setFontSize(8);
      pdf.setTextColor(140);
      pdf.text(`${index + 1} / ${slices.length}`, A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 6, { align: 'right' });
    }
  });

  return pdf.output('blob');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
