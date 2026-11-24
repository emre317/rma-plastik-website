/*
  Captures a DatasheetDocument as a one-page PDF, laid out exactly as the
  site's own "@media print" rules draw it (global.css, .dsSheet and
  friends) rather than the roomier on-screen preview: that tighter layout is
  what a visitor actually gets from "PDF olarak kaydet", and the proforma
  e-mail attaches this to match it.

  html2canvas renders the normal (screen) styles, so the print rules are
  copied here, verbatim, and injected into the off-screen clone it rasterizes
  from (onclone) — nothing on the live page is touched. Keep PRINT_CSS in
  sync by hand with the "@media print" blocks for .dsSheet in global.css.
*/
import { makeOfferPdf } from '../AdminQuoteOffer/offerPdf.js';

const PRINT_CSS = `
  .dsSheet { padding: 11mm 13mm 9mm; gap: 5.5mm; width: 210mm; min-height: 296mm; border-radius: 0; box-shadow: none; }
  .dsHero { gap: 7mm; grid-template-columns: 58mm 1fr; }
  .dsPhoto { padding: 3mm; }
  .dsIntro h1 { font-size: 23pt; }
  .dsHighlights { margin-top: 4mm; gap: 2.5mm; }
  .dsHighlights div { padding: 2.2mm 3.5mm; }
  .dsHighlights dd { font-size: 13pt; }
  .dsSpecs th, .dsSpecs td { padding: 1.7mm 2.5mm; font-size: 9.5pt; }
  .dsSide { gap: 5mm; }
  .dsChecks { gap: 1.3mm; }
  .dsChecks li { font-size: 8.8pt; line-height: 1.35; }
  .dsBody { grid-template-columns: 1.15fr 1fr; }
  .dsBody:not(:has(.dsSide)) { grid-template-columns: 1fr; }
  .dsFoot { grid-template-columns: 1fr 1.4fr 1.2fr; }
  .dsBody.dsBodyWide { grid-template-columns: minmax(0, 1fr); gap: 4mm; }
  .dsSheetWide { padding-top: 9mm; gap: 3.6mm; }
  .dsSheetWide .dsHead { padding-bottom: 3.5mm; }
  .dsSheetWide .dsChecks li { margin-bottom: 0.9mm; font-size: 8.6pt; line-height: 1.3; }
  .dsSheetWide .dsHero { grid-template-columns: 42mm 1fr; }
  .dsSheetWide .dsHighlights { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 3mm; }
  .dsSheetWide .dsHighlights dd { font-size: 11.5pt; }
  .dsBodyWide .dsSpecs tbody { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dsFeaturesWide .dsChecks { columns: 2; }
  .dsFeaturesWide .dsChecks li { margin-bottom: 1.3mm; }
`;

export async function makeDatasheetPdf(element) {
  return makeOfferPdf(element, {
    onclone: (clonedDocument) => {
      const style = clonedDocument.createElement('style');
      style.textContent = PRINT_CSS;
      clonedDocument.head.appendChild(style);
    },
  });
}
