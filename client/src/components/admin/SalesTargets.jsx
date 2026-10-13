import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil, Plus, Target, Trash2, X } from 'lucide-react';

import { deleteSalesTarget, getSalesTargets, saveSalesTarget } from '../../services/adminApi';
import useAdminApi from '../../hooks/useAdminApi';
import { formatMoney, OFFER_CURRENCIES } from '../../data/offerText';
import Dropdown from '../ui/Dropdown';
import { useAdminSession } from './AdminSession';

/*
  Monthly sales targets (set by admins) against the offers won in each month.
  A request counts in the month it was marked "Kazanıldı"; the amount is its
  proforma without VAT, in the target's currency.
*/

const monthName = (month, style = 'long') => {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('tr-TR', { month: style, ...(style === 'long' ? { year: 'numeric' } : {}), timeZone: 'UTC' }).format(new Date(Date.UTC(year, number - 1, 1)));
};

// "50.000" / "50.000,50" (Turkish) or "50000.50" -> number
function parseAmount(text) {
  const value = String(text || '').replace(/\s/g, '');
  if (value.includes(',')) return Number(value.replace(/\./g, '').replace(',', '.'));
  if (/^\d+\.\d{1,2}$/.test(value)) return Number(value);
  return Number(value.replace(/\./g, ''));
}

const share = (part, whole) => (whole > 0 ? part / whole : null);
const pct = (value) => (value === null ? '—' : `%${Math.round(value * 100)}`);

// Days left in the current month (Istanbul calendar)
function daysLeft(month) {
  const [year, number] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const today = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', day: '2-digit' }).format(new Date()));
  return Math.max(0, last - today);
}

function Bar({ value }) {
  const width = value === null ? 0 : Math.min(100, Math.round(value * 100));
  return (
    <span className={`adTargetBar ${value !== null && value >= 1 ? 'done' : ''}`} aria-hidden="true">
      <span style={{ width: `${width}%` }} />
    </span>
  );
}

/* Progress of one month: each currency's amount and the won requests against the target */
function MonthProgress({ row, compact = false }) {
  const { target } = row;
  const targeted = (target?.amounts || []).map((item) => item.currency);
  const dealShare = target?.deals ? share(row.won, target.deals) : null;
  const others = row.byCurrency.filter((item) => !targeted.includes(item.currency) && item.value > 0);

  return (
    <div className={`adTargetNow ${compact ? 'compact' : ''}`}>
      {row.achieved.map((item) => {
        const value = share(item.value, item.amount);
        return (
          <div key={item.currency} className="adTargetMetric">
            <span className="adTargetLabel">{item.currency} Tutar (KDV hariç)</span>
            <strong>{formatMoney(item.value, item.currency)}</strong>
            <small>/ {formatMoney(item.amount, item.currency)} · {pct(value)}</small>
            <Bar value={value} />
          </div>
        );
      })}
      {target?.deals > 0 && (
        <div className="adTargetMetric">
          <span className="adTargetLabel">Kazanılan Talep</span>
          <strong>{row.won}</strong>
          <small>/ {target.deals} · {pct(dealShare)}</small>
          <Bar value={dealShare} />
        </div>
      )}
      {others.length > 0 && (
        <p className="adTargetOther">Hedef girilmemiş para biriminde kazanılan: {others.map((item) => formatMoney(item.value, item.currency)).join(' · ')}</p>
      )}
    </div>
  );
}

/* Dashboard: this month's company target and the signed-in person's own target */
export function SalesTargetStrip() {
  const call = useAdminApi();
  const { admin } = useAdminSession();
  const [rows, setRows] = useState([]);
  const name = admin?.name || '';

  useEffect(() => {
    let cancelled = false;
    const thisMonth = (response) => (response.data || []).find((item) => item.month === response.currentMonth && item.target) || null;

    Promise.all([
      call(getSalesTargets, {}).catch(() => null),
      name ? call(getSalesTargets, { owner: name }).catch(() => null) : null,
    ]).then(([company, own]) => {
      if (cancelled) return;
      setRows([
        company && thisMonth(company) ? { ...thisMonth(company), label: 'Şirket Geneli' } : null,
        own && thisMonth(own) ? { ...thisMonth(own), label: 'Sizin Hedefiniz' } : null,
      ].filter(Boolean));
    });

    return () => {
      cancelled = true;
    };
  }, [call, name]);

  if (!rows.length) return null;

  return (
    <div className="adCard adTargetStrip">
      <div className="adCardHead">
        <h2><Target aria-hidden="true" />{monthName(rows[0].month)} Hedefi</h2>
        <Link to="/admin/quote-reports#targets" className="adHint">{daysLeft(rows[0].month)} gün kaldı · Ayrıntılar</Link>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="adTargetStripRow">
          {rows.length > 1 && <span className="adTargetHeroLabel">{row.label}</span>}
          <MonthProgress row={row} compact />
        </div>
      ))}
    </div>
  );
}

const newAmount = (currency = 'USD') => ({ currency, amount: '' });
const EMPTY_FORM = { amounts: [newAmount()], deals: '' };
const amountText = (value) => (value ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(value) : '');

/* Satış Raporu: the year's targets, editable by admins */
export default function SalesTargets() {
  const call = useAdminApi();
  const { can } = useAdminSession();
  const editor = can('settings');

  const [year, setYear] = useState(() => Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric' }).format(new Date())));
  const [rows, setRows] = useState(null);
  const [owner, setOwner] = useState('');
  const [owners, setOwners] = useState([]);
  const [people, setPeople] = useState({ month: '', list: [] });
  const [current, setCurrent] = useState('');
  const [editing, setEditing] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await call(getSalesTargets, { from: `${year}-01`, to: `${year}-12`, owner });
      setRows(response.data || []);
      setOwners(response.owners || []);
      setPeople({ month: response.peopleMonth || '', list: response.people || [] });
      setCurrent(response.currentMonth || '');
    } catch (err) {
      setError(err.message);
      setRows([]);
    }
  }, [call, year, owner]);

  useEffect(() => {
    setEditing('');
    load();
  }, [load]);

  function edit(row) {
    // A new target starts from the previous month's currencies
    const previous = [...(rows || [])].reverse().find((item) => item.month < row.month && item.target?.amounts.length);
    setEditing(row.month);
    setForm(row.target
      ? {
        amounts: row.target.amounts.length ? row.target.amounts.map((item) => ({ currency: item.currency, amount: amountText(item.amount) })) : [newAmount()],
        deals: row.target.deals ? String(row.target.deals) : '',
      }
      : { ...EMPTY_FORM, amounts: previous ? previous.target.amounts.map((item) => newAmount(item.currency)) : [newAmount()] });
  }

  const setAmount = (index, changes) =>
    setForm((current) => ({ ...current, amounts: current.amounts.map((item, i) => (i === index ? { ...item, ...changes } : item)) }));

  function addCurrency() {
    const free = OFFER_CURRENCIES.find((currency) => !form.amounts.some((item) => item.currency === currency));
    if (free) setForm({ ...form, amounts: [...form.amounts, newAmount(free)] });
  }

  const removeCurrency = (index) => setForm({ ...form, amounts: form.amounts.filter((_, i) => i !== index) });

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await call(saveSalesTarget, editing, {
        // Rows left empty are skipped
        amounts: form.amounts.filter((item) => String(item.amount).trim()).map((item) => ({ currency: item.currency, amount: parseAmount(item.amount) })),
        deals: form.deals === '' ? 0 : Number(form.deals),
        owner,
      });
      setEditing('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(month) {
    if (!window.confirm(`${monthName(month)} hedefi (${owner || 'şirket geneli'}) silinsin mi?`)) return;
    setSaving(true);
    setError('');
    try {
      await call(deleteSalesTarget, month, owner);
      setEditing('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const now = rows?.find((row) => row.month === current);
  const anyTarget = rows?.some((row) => row.target);

  return (
    <div className="adCard adTargets" id="targets">
      <div className="adCardHead">
        <h2><Target aria-hidden="true" />Aylık Satış Hedefi</h2>
        <div className="adTargetTools">
          <Dropdown
            className="adDd adTargetOwner"
            value={owner}
            onChange={setOwner}
            label="Kimin hedefi"
            searchable={owners.length > 8}
            searchPlaceholder="Kişi ara…"
            options={[{ value: '', label: 'Şirket Geneli' }, ...owners.map((name) => ({ value: name, label: name }))]}
            align="end"
          />
          <div className="adYearSwitch">
          <button type="button" className="adIconButton" onClick={() => setYear(year - 1)} aria-label="Önceki yıl"><ChevronLeft aria-hidden="true" /></button>
          <strong>{year}</strong>
          <button type="button" className="adIconButton" onClick={() => setYear(year + 1)} aria-label="Sonraki yıl"><ChevronRight aria-hidden="true" /></button>
          </div>
        </div>
      </div>

      {error && <div className="adminInlineError" role="alert">{error}</div>}
      {rows === null && <div className="adSkeletonList" aria-label="Yükleniyor"><span /><span /></div>}

      {rows !== null && (
        <>
          {now?.target && (
            <div className="adTargetHero">
              <span className="adTargetHeroLabel">{owner || 'Şirket Geneli'} · {monthName(now.month)} · {daysLeft(now.month)} gün kaldı</span>
              <MonthProgress row={now} />
            </div>
          )}

          {!owner && people.list.length > 0 && (
            <div className="adTargetPeople">
              <span className="adTargetLabel">Kişi Bazında · {monthName(people.month)}</span>
              <ul>
                {people.list.map((person) => (
                  <li key={person.owner}>
                    <button type="button" className="adTargetPerson" onClick={() => setOwner(person.owner)} title="Bu kişinin hedeflerini aç">
                      <strong>{person.owner}</strong>
                      <span className="adTargetShares">
                        {[
                          ...person.achieved.map((item) => ({ key: item.currency, text: `${formatMoney(item.value, item.currency)} / ${formatMoney(item.amount, item.currency)}`, value: share(item.value, item.amount) })),
                          ...(person.target.deals ? [{ key: 'Talep', text: `${person.won} / ${person.target.deals}`, value: share(person.won, person.target.deals) }] : []),
                        ].map((item) => (
                          <span key={item.key} className="adTargetShare">
                            <em>{item.key}</em>
                            <Bar value={item.value} />
                            <small>{pct(item.value)}</small>
                            <span className="adTargetPersonText">{item.text}</span>
                          </span>
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {owner && (
            <p className="adTargetOwnerNote">
              {owner} için gerçekleşen: “Sorumlu” alanında bu ad yazan ve “Kazanıldı” olarak işaretlenen talepler.
              <button type="button" className="adTextButton" onClick={() => setOwner('')}>Şirket Geneline Dön</button>
            </p>
          )}

          {!anyTarget && (
            <p className="adNotesEmpty">
              {editor
                ? `${owner || 'Şirket geneli'} için ${year} yılında henüz hedef yok. Bir ayın satırındaki “Hedef Belirle” ile bir veya birden fazla para biriminde tutar ve/veya kazanılacak talep sayısı girin. Kişi hedefi için üstten kişiyi seçin.`
                : `${owner || 'Şirket geneli'} için ${year} yılında henüz hedef belirlenmedi. Hedefleri Yönetici rolündeki kullanıcılar belirler.`}
            </p>
          )}

          <div className="adTargetTable" role="table" aria-label={`${year} aylık hedefler`}>
            <div className="adTargetHead" role="row">
              <span role="columnheader">Ay</span>
              <span role="columnheader">Hedef</span>
              <span role="columnheader">Gerçekleşen</span>
              <span role="columnheader">Oran</span>
              <span role="columnheader">Kazanılan Talep</span>
              {editor && <span role="columnheader"><span className="visuallyHidden">İşlem</span></span>}
            </div>

            {rows.map((row) => {
              const target = row.target;
              const future = current && row.month > current;
              const shares = target
                ? [
                  ...row.achieved.map((item) => ({ key: item.currency, value: share(item.value, item.amount) })),
                  ...(target.deals ? [{ key: 'Talep', value: share(row.won, target.deals) }] : []),
                ]
                : [];

              if (editing === row.month) {
                const filled = form.amounts.some((item) => String(item.amount).trim()) || Number(form.deals) > 0;
                return (
                  <form key={row.month} className="adTargetRow editing" role="row" onSubmit={save}>
                    <span role="cell" className="adTargetMonth">{monthName(row.month, 'short')}</span>
                    <span role="cell" className="adTargetForm">
                      {form.amounts.map((item, index) => (
                        <span key={index} className="adTargetAmount">
                          <Dropdown
                            className="adDd"
                            value={item.currency}
                            onChange={(currency) => setAmount(index, { currency })}
                            label="Para birimi"
                            options={OFFER_CURRENCIES
                              .filter((currency) => currency === item.currency || !form.amounts.some((other) => other.currency === currency))
                              .map((value) => ({ value, label: value }))}
                          />
                          <input type="text" inputMode="decimal" value={item.amount} onChange={(event) => setAmount(index, { amount: event.target.value })} placeholder="Tutar (KDV hariç)" aria-label={`${item.currency} hedef tutar, KDV hariç`} />
                          {form.amounts.length > 1 && (
                            <button type="button" className="adIconButton" onClick={() => removeCurrency(index)} aria-label={`${item.currency} hedefini kaldır`} title="Kaldır"><X aria-hidden="true" /></button>
                          )}
                        </span>
                      ))}
                      <span className="adTargetAmount">
                        {form.amounts.length < OFFER_CURRENCIES.length && (
                          <button type="button" className="adTextButton" onClick={addCurrency}><Plus aria-hidden="true" />Para Birimi Ekle</button>
                        )}
                        <span className="adTargetDealsLabel">Kazanılacak talep</span>
                        <input type="number" min="0" step="1" value={form.deals} onChange={(event) => setForm({ ...form, deals: event.target.value })} placeholder="Talep sayısı" aria-label="Kazanılacak talep sayısı" />
                      </span>
                    </span>
                    <span role="cell" className="adTargetActions">
                      <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving || !filled}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
                      <button type="button" className="cmsButton" onClick={() => setEditing('')} disabled={saving}>Vazgeç</button>
                      {target && (
                        <button type="button" className="adIconButton danger" onClick={() => remove(row.month)} disabled={saving} aria-label="Hedefi sil" title="Hedefi sil"><Trash2 aria-hidden="true" /></button>
                      )}
                    </span>
                  </form>
                );
              }

              return (
                <div key={row.month} className={`adTargetRow ${row.month === current ? 'current' : ''}`} role="row">
                  <span role="cell" className="adTargetMonth">{monthName(row.month, 'short')}</span>
                  <span role="cell" className="adTargetList">
                    {target
                      ? [...target.amounts.map((item) => formatMoney(item.amount, item.currency)), target.deals ? `${target.deals} talep` : ''].filter(Boolean).map((text) => <span key={text}>{text}</span>)
                      : <span className="adMuted">—</span>}
                  </span>
                  <span role="cell" className="adTargetList">
                    {future
                      ? <span className="adMuted">—</span>
                      : row.byCurrency.length
                        ? row.byCurrency.map((item) => <span key={item.currency}>{formatMoney(item.value, item.currency)}</span>)
                        : <span className="adMuted">0</span>}
                  </span>
                  <span role="cell" className="adTargetShares">
                    {shares.length && !future ? shares.map((item) => (
                      <span key={item.key} className="adTargetShare">
                        <em>{item.key}</em>
                        <Bar value={item.value} />
                        <small>{pct(item.value)}</small>
                      </span>
                    )) : <span className="adMuted">—</span>}
                  </span>
                  <span role="cell">{future ? <span className="adMuted">—</span> : `${row.won}${target?.deals ? ` / ${target.deals}` : ''}`}</span>
                  {editor && (
                    <span role="cell" className="adTargetActions">
                      <button type="button" className="adTextButton" onClick={() => edit(row)}>
                        <Pencil aria-hidden="true" />
                        {target ? 'Düzenle' : 'Hedef Belirle'}
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <small className="cmsHint">
            Gerçekleşen: o ay “Kazanıldı” olarak işaretlenen taleplerin proforma tutarı (KDV hariç), her para birimi kendi hedefiyle karşılaştırılır; kurlar arasında çevrim yapılmaz. Proformasız kazanılan talepler yalnızca talep sayısına eklenir.
          </small>
        </>
      )}
    </div>
  );
}
