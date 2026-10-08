import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import families, { familyText } from '../data/productTables';
import useModelQuote from './useModelQuote';
import { localizePath } from '../i18n/languages';

/*
  Quote list as a link: "?list=<code>" holds the chosen models and quantities
  (family id, model code, quantity), so a visitor can send the list to a
  colleague or the purchasing department. Opening the link adds the models to
  the visitor's own list (QuoteContext).
*/

export const SHARE_PARAM = 'list';

const MAX_ITEMS = 30;

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export default function useQuoteShare() {
  const { i18n } = useTranslation();
  const quoteForModel = useModelQuote();

  // Items saved before models carried a reference are found by their (Turkish) name
  const refByName = useMemo(() => {
    const tr = i18n.getFixedT('tr');
    const map = new Map();
    families.forEach((family) => {
      const title = familyText(family, 'title', 'tr', tr);
      family.rows.forEach((row) => map.set(`${title} – ${row.code}`, `${family.id}|${row.code}`));
    });
    return map;
  }, [i18n]);

  const shareUrl = useCallback(
    (cart) => {
      const entries = cart
        .map((item) => {
          const ref = item.ref || refByName.get(item.name);
          if (!ref) return null;
          const [family, code] = ref.split('|');
          return [family, code, Math.max(1, Number(item.quantity) || 1)];
        })
        .filter(Boolean)
        .slice(0, MAX_ITEMS);

      if (!entries.length) return '';

      const path = localizePath('/', i18n.resolvedLanguage);
      return `${window.location.origin}${path}?${SHARE_PARAM}=${toBase64Url(JSON.stringify(entries))}`;
    },
    [i18n.resolvedLanguage, refByName]
  );

  // "?list=" value -> [{ product, quantity }] (unknown or removed models are skipped)
  const readShared = useCallback(
    (value) => {
      try {
        const entries = JSON.parse(fromBase64Url(String(value)));
        if (!Array.isArray(entries)) return [];

        return entries.slice(0, MAX_ITEMS).flatMap((entry) => {
          if (!Array.isArray(entry)) return [];
          const [familyId, code, quantity] = entry;
          const family = families.find((item) => item.id === familyId);
          const row = family?.rows.find((item) => String(item.code) === String(code));
          if (!row) return [];
          return [{ product: quoteForModel(family, row), quantity: Math.min(99999, Math.max(1, Math.round(Number(quantity) || 1))) }];
        });
      } catch {
        return [];
      }
    },
    [quoteForModel]
  );

  return { shareUrl, readShared };
}
