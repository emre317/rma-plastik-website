import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import builtInMarkets from '../../data/exportMarkets.builtin';
import world from '../../data/worldMapCountries.json';
import {
  createExportMarket, deleteExportMarket, importExportMarkets, listExportMarkets, updateExportMarket,
} from '../../services/adminContentApi';
import Dropdown from '../../components/ui/Dropdown';

const LANGS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const POSITIONS = [
  { id: 'top', label: 'Üstte' },
  { id: 'bottom', label: 'Altta' },
  { id: 'left', label: 'Solda' },
  { id: 'right', label: 'Sağda' },
];

// 🇧🇬 from "BG"
const flag = (code) => String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));

const displayName = (code, lang) => {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
};

const empty = (order) => ({
  _id: null,
  code: '',
  labelPosition: 'top',
  published: true,
  order,
  i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { name: '', region: '' }])),
});

/* Export markets on the home page map and the company page (İhracat ağı) */
export default function AdminExportMarkets() {
  usePageTitle('İhracat Ağı');

  const call = useAdminApi();

  const [markets, setMarkets] = useState([]);
  const [form, setForm] = useState(null);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Countries that can be drawn on the dotted map, by Turkish name
  const countries = useMemo(() => {
    const collator = new Intl.Collator('tr');
    return Object.keys(world)
      .map((code) => ({ code, name: displayName(code, 'tr') }))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, []);

  async function load() {
    try {
      const { data } = await call(listExportMarkets);
      setMarkets(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(market) {
    setMessage(null);
    setLang('tr');
    setForm(
      market
        ? {
            _id: market._id,
            code: market.code,
            labelPosition: market.labelPosition || 'top',
            published: market.published,
            order: market.order,
            i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { name: '', region: '', ...market.i18n?.[code] }])),
          }
        : empty(((markets[markets.length - 1]?.order) || 0) + 10)
    );
  }

  const setText = (field, value) =>
    setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  async function save(event) {
    event.preventDefault();

    if (!form.code) {
      setMessage({ type: 'error', text: 'Lütfen bir ülke seçin.' });
      return;
    }

    try {
      setSaving(true);
      if (form._id) await call(updateExportMarket, form._id, form);
      else await call(createExportMarket, form);
      setForm(null);
      setMessage({ type: 'success', text: 'Pazar kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(market) {
    if (!window.confirm(`${displayName(market.code, 'tr')} listeden kaldırılsın mı?`)) return;

    try {
      await call(deleteExportMarket, market._id);
      setMarkets((list) => list.filter((item) => item._id !== market._id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  // Move one step up/down; orders are renumbered 10, 20, 30… (the map plays markets in this order)
  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= markets.length) return;

    const next = [...markets];
    [next[index], next[target]] = [next[target], next[index]];
    const changed = next
      .map((market, position) => ({ ...market, order: (position + 1) * 10 }))
      .filter((market, position) => market.order !== markets.find((item) => item._id === next[position]._id).order);

    try {
      setSaving(true);
      await Promise.all(changed.map((market) => call(updateExportMarket, market._id, market)));
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function importDefaults() {
    try {
      setSaving(true);
      await call(importExportMarkets);
      setMessage({ type: 'success', text: 'Broşürdeki pazarlar panele aktarıldı. Artık düzenleyebilirsiniz.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const activeLanguage = LANGS.find((item) => item.code === lang);
  const taken = new Set(markets.filter((market) => market._id !== form?._id).map((market) => market.code));

  return (
    <section className="adminContent">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Katalog</span>
          <h1>İhracat Ağı</h1>
          <p>
            Ana sayfadaki ve Kurumsal sayfasındaki dünya haritasında gösterilen ihracat pazarları. Harita pazarları bu sırayla tek tek
            vurgular; “Başlıca ihracat pazarı” sayısı, kıta sayısı ve tanıtım metnindeki ülke listesi otomatik güncellenir.
          </p>
        </div>
        {!form && (
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => edit(null)}>+ Pazar Ekle</button>
        )}
      </header>

      {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

      {form && (
        <form className="cmsCard cmsVideoForm" onSubmit={save}>
          <div className="cmsVideoFormGrid">
            <div className="cmsColumn">
              <div className="cmsField">
                <span>Ülke *</span>
                <Dropdown
                  value={form.code}
                  onChange={(code) => setForm({ ...form, code })}
                  placeholder="Ülke Seçin"
                  label="Ülke"
                  searchable
                  searchPlaceholder="Ülke ara…"
                  options={countries.map((country) => ({
                    value: country.code,
                    label: `${flag(country.code)} ${country.name}`,
                    hint: taken.has(country.code) ? 'Listede' : undefined,
                    disabled: taken.has(country.code),
                  }))}
                />
                <small>Haritada çizilebilen {countries.length} ülke listelenir.</small>
              </div>

              <div className="cmsTabs" role="tablist">
                {LANGS.map((item) => (
                  <button key={item.code} type="button" role="tab" aria-selected={lang === item.code} className={lang === item.code ? 'active' : ''} onClick={() => setLang(item.code)}>
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="cmsInline cmsInlineEven">
                <label className="cmsField">
                  <span>Görünen Ad</span>
                  <input dir={activeLanguage.dir} value={form.i18n[lang].name} maxLength={80} placeholder={form.code ? displayName(form.code, lang) : 'Ülke Adı'} onChange={(event) => setText('name', event.target.value)} />
                  <small>Boş bırakılırsa ülkenin bu dildeki adı kullanılır.</small>
                </label>

                <label className="cmsField">
                  <span>Bölge</span>
                  <input dir={activeLanguage.dir} value={form.i18n[lang].region} maxLength={80} placeholder="ör. Balkanlar, Batı Avrupa" onChange={(event) => setText('region', event.target.value)} />
                </label>
              </div>

              <div className="cmsInline cmsInlineEven">
                <div className="cmsField">
                  <span>Haritada etiket konumu</span>
                  <Dropdown
                    value={form.labelPosition}
                    onChange={(labelPosition) => setForm({ ...form, labelPosition })}
                    label="Haritada etiket konumu"
                    options={POSITIONS.map((position) => ({ value: position.id, label: position.label }))}
                  />
                  <small>Etiket komşu ülkeyle çakışırsa değiştirin.</small>
                </div>

                <label className="cmsField">
                  <span>Sıra</span>
                  <input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })} />
                </label>
              </div>

              <label className="cmsCheck">
                <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
                <span>Sitede Göster</span>
              </label>
            </div>

            <div className="cmsColumn adMarketPreview">
              {form.code ? (
                <>
                  <span className="adMarketFlag" aria-hidden="true">{flag(form.code)}</span>
                  <strong>{form.i18n.tr.name || displayName(form.code, 'tr')}</strong>
                  <small>{form.i18n.tr.region || 'Bölge belirtilmedi'}</small>
                </>
              ) : (
                <small>Önizleme için ülke seçin.</small>
              )}
            </div>
          </div>

          <div className="cmsRowActions">
            <button type="button" className="cmsButton" onClick={() => setForm(null)}>Vazgeç</button>
            <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>
      ) : markets.length === 0 ? (
        !form && (
          <div className="cmsEmpty">
            <p>
              Panelde henüz pazar yok; sitede şu an broşürdeki {builtInMarkets.length} pazar gösteriliyor
              ({builtInMarkets.map((market) => market.i18n.tr.name).join(', ')}). Düzenleyebilmek için önce panele aktarın.
            </p>
            <button type="button" className="cmsButton cmsButtonPrimary" onClick={importDefaults} disabled={saving}>Broşür pazarlarını içe aktar</button>
          </div>
        )
      ) : (
        <ol className="adMarketList">
          {markets.map((market, index) => (
            <li key={market._id} className={market.published ? '' : 'hidden'}>
              <span className="adMarketIndex">{String(index + 1).padStart(2, '0')}</span>
              <span className="adMarketFlag" aria-hidden="true">{flag(market.code)}</span>
              <span className="adMarketText">
                <strong>{market.i18n?.tr?.name || displayName(market.code, 'tr')}</strong>
                <small>{[market.i18n?.tr?.region, market.published ? 'Sitede' : 'Gizli'].filter(Boolean).join(' · ')}</small>
              </span>
              <span className="adMarketMove">
                <button type="button" className="adIconButton" onClick={() => move(index, -1)} disabled={saving || index === 0} aria-label="Yukarı taşı"><ArrowUp aria-hidden="true" /></button>
                <button type="button" className="adIconButton" onClick={() => move(index, 1)} disabled={saving || index === markets.length - 1} aria-label="Aşağı taşı"><ArrowDown aria-hidden="true" /></button>
              </span>
              <span className="cmsRowActions">
                <button type="button" className="cmsButton" onClick={() => edit(market)}>Düzenle</button>
                <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(market)}>Kaldır</button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
