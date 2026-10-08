import content from '@content';

import builtInMarkets from './exportMarkets.builtin';
import { countContinents } from './continents';

/*
  Export markets shown in the Global section (map + market list). Markets
  managed in the admin panel come from the published content snapshot;
  otherwise the brochure list is used.
  Market: { code (ISO 3166-1 alpha-2), labelPosition, i18n: { tr|en|ar: { name, region } } }
*/
const markets = (Array.isArray(content.exportMarkets) && content.exportMarkets.length ? content.exportMarkets : builtInMarkets)
  .map((market) => ({ ...market, key: market.code.toLowerCase() }));

/* Country name in the site language: admin text → browser name → Turkish text */
export function marketName(market, lang) {
  if (market.i18n?.[lang]?.name) return market.i18n[lang].name;

  try {
    const name = new Intl.DisplayNames([lang], { type: 'region' }).of(market.code);
    if (name && name !== market.code) return name;
  } catch {
    // Older browsers: fall back to the Turkish text
  }

  return market.i18n?.tr?.name || market.code;
}

export const marketRegion = (market, lang) => market.i18n?.[lang]?.region || market.i18n?.tr?.region || '';

/* Continents reached by the export markets (follows the list in the admin panel) */
export const continentCount = countContinents(markets.map((market) => market.code));

/*
  Global figures from the locale files ("6 Başlıca ihracat pazarı", "4 Kıta",
  "Mersin") with the first two counted from the market list.
*/
export function globalFigures(figureList) {
  return (Array.isArray(figureList) ? figureList : []).map((figure, index) => {
    if (index === 0) return { ...figure, value: String(markets.length) };
    if (index === 1) return { ...figure, value: String(continentCount) };
    return figure;
  });
}

export default markets;
