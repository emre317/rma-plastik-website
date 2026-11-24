import families from './productTables';

/*
  Catalogue models recognised in a proforma's lines, so the e-mail sent to
  the customer can attach each one's technical drawing and datasheet
  automatically (AdminQuoteOffer.jsx). A line is recognised by its model
  code (e.g. "RD-5000") appearing in its name or details; a line with no
  match (freight, tooling, a fully custom product...) contributes nothing.

  Mirrors server/services/catalogAttachments.js' matchFromFamilies, which
  does the same thing server-side for the drawing file; keep both in sync.
*/
function normalizeCode(value) {
  return String(value || '')
    .toLocaleUpperCase('tr')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function matchLine(text) {
  const haystack = normalizeCode(text);
  if (haystack.length < 3) return null;

  let best = null;

  for (const family of families) {
    for (const row of family.rows || []) {
      const code = normalizeCode(row.code);
      if (code.length < 3 || !haystack.includes(code)) continue;
      if (!best || code.length > best.codeLength) best = { family, row, codeLength: code.length };
    }
  }

  return best ? { family: best.family, row: best.row } : null;
}

const MAX_MATCHED_PRODUCTS = 8;

/* One entry per distinct catalogue model recognised in `offer.lines`, in line order. */
export function matchedOfferProducts(offer, max = MAX_MATCHED_PRODUCTS) {
  const seen = new Set();
  const matches = [];

  for (const line of offer?.lines || []) {
    if (matches.length >= max) break;

    const found = matchLine(`${line.name || ''} ${line.details || ''}`);
    if (!found) continue;

    const key = `${found.family.id}|${found.row.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(found);
  }

  return matches;
}
