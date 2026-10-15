import { useEffect, useMemo, useState } from 'react';

import tr from '../../i18n/locales/tr';
import en from '../../i18n/locales/en';
import ar from '../../i18n/locales/ar';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { listTexts, saveTexts } from '../../services/adminContentApi';

const DEFAULTS = { tr, en, ar };
const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

// Not page copy, or copy of sections no longer on the site
const EXCLUDED = ['language', 'global', 'faq'];
const EXCLUDED_KEYS = ['pages.company.eco'];

const SECTION_LABELS = {
  meta: 'SEO – sayfa başlıkları ve açıklamaları',
  nav: 'Menü',
  common: 'Genel İfadeler',
  cookies: 'Çerez Bandı',
  floatingContact: 'İletişim Balonları',
  footer: 'Footer',
  hero: 'Ana sayfa – Giriş',
  stats: 'Ana sayfa – Rakamlar',
  machinePark: 'Ana sayfa – Makina parkuru',
  productExplorer: 'Ana sayfa – Ürün gezgini',
  industries: 'Ana sayfa – Sektörler',
  customMolding: 'Ana sayfa – Özel Üretim',
  pages: 'İç sayfalar (Kurumsal, Özel Üretim, Sektörler…)',
  productsPage: 'Ürünler Sayfası',
  waterTanks: 'Su depoları sayfası',
  productTables: 'Ürün tabloları sayfası',
  contact: 'İletişim ve teklif formu',
};

/* { a: { b: ['x'] } } -> [['a.b.0', 'x']] (strings only) */
function flatten(value, prefix = '', out = []) {
  if (typeof value === 'string') {
    out.push([prefix, value]);
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key, out));
  }

  return out;
}

const valueAt = (object, key) => key.split('.').reduce((node, part) => node?.[part], object);

function humanize(key) {
  return key.split('.').slice(1).map((part) => (/^\d+$/.test(part) ? `#${Number(part) + 1}` : part)).join(' › ');
}

export default function AdminTexts() {
  usePageTitle('Sayfa Metinleri');

  const call = useAdminApi();

  const sections = useMemo(
    () => Object.keys(tr).filter((key) => !EXCLUDED.includes(key)),
    []
  );

  const [section, setSection] = useState(sections[0]);
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState({}); // key -> { tr, en, ar } from the database
  const [draft, setDraft] = useState({}); // edited values not saved yet
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await call(listTexts);
        setSaved(Object.fromEntries((data || []).map((item) => [item.key, { tr: item.tr, en: item.en, ar: item.ar }])));
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [call]);

  const fields = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    const source = q ? sections : [section];

    return source
      .flatMap((name) => flatten(tr[name], name))
      .filter(([key]) => !EXCLUDED_KEYS.some((prefix) => key === prefix || key.startsWith(`${prefix}.`)))
      .filter(([key, value]) => {
        if (!q) return true;
        const current = { ...saved[key], ...draft[key] };
        return [key, value, current.tr, current.en].some((text) => text?.toLocaleLowerCase('tr').includes(q));
      })
      .map(([key]) => key);
  }, [query, section, sections, saved, draft]);

  const current = (key, lang) => draft[key]?.[lang] ?? saved[key]?.[lang] ?? '';

  function edit(key, lang, value) {
    setDraft((items) => ({
      ...items,
      [key]: { ...(items[key] || { tr: current(key, 'tr'), en: current(key, 'en'), ar: current(key, 'ar') }), [lang]: value },
    }));
  }

  function reset(key) {
    setDraft((items) => ({ ...items, [key]: { tr: '', en: '', ar: '' } }));
  }

  const dirtyKeys = Object.keys(draft);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      // A value equal to the default is not an override
      const items = dirtyKeys.map((key) => ({
        key,
        ...Object.fromEntries(
          LANGS.map(({ code }) => {
            const value = (draft[key][code] || '').trim();
            return [code, value === valueAt(DEFAULTS[code], key) ? '' : value];
          })
        ),
      }));

      await call(saveTexts, items);

      setSaved((items0) => {
        const next = { ...items0 };
        items.forEach(({ key, ...values }) => {
          if (LANGS.every(({ code }) => !values[code])) delete next[key];
          else next[key] = values;
        });
        return next;
      });
      setDraft({});
      setMessage({ type: 'success', text: `${items.length} metin kaydedildi. Sitede görünmesi için “Yayınla”ya basın.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="adminContent">

      <div className="adminPageHeader">
        <div>
          <span className="adminLabel">İÇERİK YÖNETİMİ</span>
          <h1>Sayfa Metinleri</h1>
        </div>

        <span>{Object.keys(saved).length} metin özelleştirildi</span>
      </div>

      <p className="cmsHint">
        Boş alan sitedeki varsayılan metni kullanır (gri yazı). <code>{'{{name}}'}</code> gibi süslü parantezli ifadeleri silmeyin.
      </p>

      {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

      <div className="cmsTexts">

        <nav className="cmsSections" aria-label="Bölümler">
          <input
            type="search"
            className="cmsSearch"
            placeholder="Tüm metinlerde ara…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {sections.map((name) => (
            <button
              key={name}
              type="button"
              className={!query && section === name ? 'active' : ''}
              onClick={() => { setQuery(''); setSection(name); }}
            >
              {SECTION_LABELS[name] || name}
              {Object.keys(saved).some((key) => key.startsWith(`${name}.`)) && <span className="cmsDot" />}
            </button>
          ))}
        </nav>

        <div className="cmsTextList">
          {loading ? (
            <div className="adminLoading">Yükleniyor…</div>
          ) : fields.length === 0 ? (
            <div className="cmsEmpty"><p>Sonuç bulunamadı.</p></div>
          ) : (
            fields.map((key) => {
              const customised = saved[key] || draft[key];

              return (
                <div key={key} className={`cmsTextItem ${draft[key] ? 'dirty' : ''}`}>
                  <div className="cmsTextItemHead">
                    <code>{query ? key : humanize(key)}</code>
                    {customised && (
                      <button type="button" className="cmsLink" onClick={() => reset(key)}>Varsayılana Dön</button>
                    )}
                  </div>

                  <div className="cmsTextInputs">
                    {LANGS.map(({ code, label, dir }) => {
                      const fallback = valueAt(DEFAULTS[code], key) || '';
                      const long = fallback.length > 70;

                      return (
                        <label key={code} className="cmsField">
                          <span>{label}</span>
                          {long ? (
                            <textarea
                              rows={3}
                              dir={dir}
                              placeholder={fallback}
                              value={current(key, code)}
                              onChange={(event) => edit(key, code, event.target.value)}
                            />
                          ) : (
                            <input
                              dir={dir}
                              placeholder={fallback}
                              value={current(key, code)}
                              onChange={(event) => edit(key, code, event.target.value)}
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={`cmsSaveBar ${dirtyKeys.length ? 'visible' : ''}`}>
        <span>{dirtyKeys.length} değişiklik kaydedilmedi</span>
        <button type="button" className="cmsButton cmsButtonPrimary" onClick={handleSave} disabled={saving || !dirtyKeys.length}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

    </section>
  );
}
