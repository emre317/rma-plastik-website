/*
  Site search engine: plain functions, no React, so it can be tested in Node.

  - Text is folded per character (Turkish İ/ı/ş/ğ…, accents, Arabic alef and
    tashkeel forms), and every folded character remembers where it came from,
    so matches can be highlighted in the original text.
  - Product codes match with or without spaces ("rd5000" = "RD 5000").
  - A number is also read as a volume: "5000", "5.000 l", "5 m3" and "5 ton"
    find the models of about that volume.
  - Small typos are forgiven on longer words ("tnak" → tank).
*/

const TR_MAP = { ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c', â: 'a', î: 'i', û: 'u' };
const AR_MAP = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي' };
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const STRIP = /[̀-ًͯ-ٰٟـ]/g;

function foldChar(char) {
  const digit = AR_DIGITS.indexOf(char);
  if (digit >= 0) return String(digit);

  const lower = char.toLocaleLowerCase('tr');
  if (TR_MAP[lower]) return TR_MAP[lower];
  if (AR_MAP[lower]) return AR_MAP[lower];

  return lower.normalize('NFD').replace(STRIP, '');
}

/* Folded text plus, for every folded character, its index in the original */
export function foldWithMap(text) {
  const source = String(text ?? '');
  let folded = '';
  const map = [];

  for (let index = 0; index < source.length; index += 1) {
    const part = foldChar(source[index]);
    for (let i = 0; i < part.length; i += 1) {
      folded += part[i];
      map.push(index);
    }
  }

  return { folded, map };
}

export const fold = (text) => foldWithMap(text).folded;

/* Letters and digits only, for codes: "RD 10000-B" → "rd10000b" */
export const compact = (text) => fold(text).replace(/[^\p{L}\p{N}]+/gu, '');

export const tokenize = (text) => fold(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/* Damerau–Levenshtein distance, stopped early once it exceeds `max` */
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  const rows = [];
  for (let i = 0; i <= a.length; i += 1) {
    rows[i] = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      if (i === 0) {
        rows[i][j] = j;
        best = Math.min(best, j);
        continue;
      }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = value;
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
  }

  return rows[a.length][b.length];
}

/*
  Volume asked for in the query, in litres, or null:
  "5000", "5.000 l", "5,000 lt", "5000 litre", "5 m3", "5 m³", "5 ton".
*/
export function readVolume(query) {
  const text = fold(query).replace(/\s+/g, ' ').trim();
  const match = text.match(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(m3|m³|metrekup|ton|lt|l|litre|liter|litres|liters|لتر)?\b/u);
  if (!match) return null;

  const raw = match[1];
  const unit = match[2] || '';
  // "5.000" / "5,000" with three digits after the mark = thousands
  const thousands = /^\d{1,3}([.,]\d{3})+$/.test(raw);
  let value = thousands ? Number(raw.replace(/[.,]/g, '')) : Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;

  if (['m3', 'm³', 'metrekup', 'ton'].includes(unit)) value *= 1000;

  // Small bare numbers are more likely part of a code than a volume
  if (!unit && value < 50) return null;

  return Math.round(value);
}

/*
  An index entry:
  { id, type, title, subtitle?, code?, keywords?: string[], text?, url?, href?,
    image?, icon?, volume?, meta?: string[], weight?: number, payload? }
  prepare() adds the folded fields used for matching.
*/
export function prepare(entries) {
  return entries.map((entry, order) => {
    const fields = [
      { words: tokenize(entry.title), weight: 3 },
      { words: tokenize(entry.code), weight: 4 },
      { words: tokenize(entry.subtitle), weight: 1.5 },
      { words: tokenize((entry.keywords || []).join(' ')), weight: 1.5 },
      { words: tokenize(entry.text), weight: 0.6 },
    ].filter((field) => field.words.length);

    return {
      ...entry,
      order,
      search: {
        fields,
        code: entry.code ? compact(entry.code) : '',
        title: compact(entry.title),
      },
    };
  });
}

function scoreToken(token, fields) {
  let best = 0;

  for (const field of fields) {
    for (const word of field.words) {
      let score = 0;
      if (word === token) score = 10;
      else if (word.startsWith(token)) score = token.length >= 2 ? 7 : 3;
      else if (token.length >= 3 && word.includes(token)) score = 3;
      else if (token.length >= 4 && word.length >= 4) {
        // Typo in a whole word, or in the beginning of a longer word
        const max = token.length >= 7 ? 2 : 1;
        if (
          editDistance(token, word, max) <= max ||
          (word.length > token.length && editDistance(token, word.slice(0, token.length), max) <= max)
        ) score = 2;
      }
      if (score) best = Math.max(best, score * field.weight);
      if (best >= 10 * field.weight && field.weight >= 3) return best;
    }
  }

  return best;
}

/*
  Expands query words with their synonyms (e.g. "depo" also looks for "tank").
  synonyms: [['depo', 'tank', 'hazne'], ...] in the site language.
*/
function expand(tokens, synonyms) {
  const groups = (synonyms || []).map((group) => group.map(fold));

  return tokens.map((token) => {
    const alternatives = new Set([token]);
    groups.forEach((group) => {
      if (group.some((word) => word === token || (token.length >= 3 && word.startsWith(token)))) {
        group.forEach((word) => alternatives.add(word));
      }
    });
    return [...alternatives];
  });
}

/*
  Scored results, best first. Every query word has to be found (in the text,
  as a synonym, or as the volume for numbers); codes and volumes add bonuses.
*/
export function runSearch(index, query, { synonyms = [], limit = 200 } = {}) {
  // "rd5000" is read as "rd" + "5000" (a family code and a volume)
  const tokens = tokenize(query).flatMap((token) => token.split(/(?<=\p{L})(?=\p{N})|(?<=\p{N})(?=\p{L})/u));
  if (!tokens.length) return [];

  const whole = compact(query);
  const volume = readVolume(query);
  const expanded = expand(tokens, synonyms);
  const isNumber = (token) => /^\d+$/.test(token);
  const unitWords = new Set(['l', 'lt', 'litre', 'liter', 'litres', 'liters', 'm', 'm3', 'ton', 'لتر']);

  const results = [];

  for (const entry of index) {
    let score = 0;
    let matchedAll = true;
    let volumeMatch = false;

    // Code typed as one word or with spaces: "rd5000", "RD 5000"
    if (entry.search.code && whole.length >= 2) {
      if (entry.search.code === whole) score += 120;
      else if (entry.search.code.startsWith(whole)) score += 70 - Math.min(30, entry.search.code.length - whole.length);
      else if (whole.length >= 3 && entry.search.code.includes(whole)) score += 35;
    }

    if (typeof entry.volume === 'number' && volume) {
      const ratio = entry.volume / volume;
      if (ratio >= 0.9 && ratio <= 1.12) {
        volumeMatch = true;
        score += ratio >= 0.98 && ratio <= 1.02 ? 45 : 25;
      }
    }

    for (const alternatives of expanded) {
      const token = alternatives[0];
      let best = 0;
      alternatives.forEach((word, i) => {
        const value = scoreToken(word, entry.search.fields);
        // Synonyms count less than the word that was typed
        best = Math.max(best, i === 0 ? value : value * 0.6);
      });

      if (!best) {
        // Numbers and units are fine when they matched as a volume or a code
        const coveredByCode = entry.search.code && whole && entry.search.code.includes(whole);
        if ((isNumber(token) && (volumeMatch || coveredByCode)) || (unitWords.has(token) && volumeMatch)) continue;
        matchedAll = false;
        break;
      }
      score += best;
    }

    // A code hit alone is enough (e.g. "rd50" while typing)
    if (!matchedAll && !(entry.search.code && whole.length >= 2 && entry.search.code.startsWith(whole))) continue;

    if (entry.search.title === whole) score += 25;

    score *= entry.weight || 1;
    if (score > 0) results.push({ entry, score, volumeMatch });
  }

  // Equal scores keep the catalogue order (e.g. vertical tanks before AdBlue tanks)
  results.sort((a, b) => b.score - a.score || (a.entry.order ?? 0) - (b.entry.order ?? 0));

  return results.slice(0, limit);
}

/*
  Parts of `text` for highlighting the query words:
  [{ text, match: boolean }]
*/
export function highlight(text, query) {
  const source = String(text ?? '');
  const tokens = [...new Set(tokenize(query))].filter((token) => token.length >= 1).sort((a, b) => b.length - a.length);
  if (!source || !tokens.length) return [{ text: source, match: false }];

  const { folded, map } = foldWithMap(source);
  const marked = new Array(source.length).fill(false);

  tokens.forEach((token) => {
    let from = 0;
    while (from < folded.length) {
      const at = folded.indexOf(token, from);
      if (at < 0) break;
      // Only from the start of a word, or anywhere for longer words
      const startOfWord = at === 0 || !/[\p{L}\p{N}]/u.test(folded[at - 1]);
      if (startOfWord || token.length >= 3) {
        for (let i = at; i < at + token.length; i += 1) marked[map[i]] = true;
      }
      from = at + token.length;
    }
  });

  // Codes typed without spaces ("rd5000") light up "RD 5000"
  const whole = compact(query);
  if (whole.length >= 2 && !marked.some(Boolean)) {
    const letters = [];
    for (let i = 0; i < folded.length; i += 1) if (/[\p{L}\p{N}]/u.test(folded[i])) letters.push(i);
    const joined = letters.map((i) => folded[i]).join('');
    const at = joined.indexOf(whole);
    if (at >= 0) for (let i = at; i < at + whole.length; i += 1) marked[map[letters[i]]] = true;
  }

  const parts = [];
  for (let i = 0; i < source.length; i += 1) {
    const last = parts[parts.length - 1];
    if (last && last.match === marked[i]) last.text += source[i];
    else parts.push({ text: source[i], match: marked[i] });
  }

  return parts;
}
