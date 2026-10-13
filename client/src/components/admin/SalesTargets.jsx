import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pencil, Target, Trash2 } from 'lucide-react';

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

/* Progress of one month: amount and won requests against the target */
function MonthProgress({ row, compact = false }) {
  const { target } = row;
  const amountShare = target?.amount ? share(row.achieved || 0, target.amount) : null;
  const dealShare = target?.deals ? share(row.won, target.deals) : null;
  const others = row.byCurrency.filter((item) => item.currency !== target?.currency && item.value > 0);

  return (
    <div className={`adTargetNow ${compact ? 'compact' : ''}`}>
      {target?.amount > 0 && (
        <div className="adTargetMetric">
          <span className="adTargetLabel">Tutar (KDV hariç)</span>
          <strong>{formatMoney(row.achieved || 0, target.currency)}</strong>
          <small>/ {formatMoney(target.amount, target.currency)} · {pct(amountShare)}</small>
          <Bar value={amountShare} />
        </div>
      )}
      {target?.deals > 0 && (
        <div className="adTargetMetric">
          <span className="adTargetLabel">Kazanılan Talep</span>
          <strong>{row.won}</strong>
          <small>/ {target.deals} · {pct(dealShare)}</small>
          <Bar value={dealShare} />
        </div>
      )}
      {others.length > 0 && (
        <p className="adTargetOther">Ayrıca hedef dışı para biriminde kazanılan: {others.map((item) => formatMoney(item.value, item.currency)).join(' · ')}</p>
      )}
    </div>
  );
}

/* Dashboard: this month's target, when one is set */
export function SalesTargetStrip() {
  const call = useAdminApi();
  const [row, setRow] = useState(null);

  useEffect(() => {
    let cancelled = false;
    call(getSalesTargets, {})
      .then((response) => {
        if (cancelled) return;
        const now = response.currentMonth;
        setRow((response.data || []).find((item) => item.month === now && item.target) || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [call]);

  if (!row) return null;

  return (
    <div className="adCard adTargetStrip">
      <div className="adCardHead">
        <h2><Target aria-hidden="true" />{monthName(row.month)} Hedefi</h2>
        <Link to="/admin/quote-reports#targets" className="adHint">{daysLeft(row.month)} gün kaldı · Ayrıntılar</Link>
      </div>
      <MonthProgress row={row} compact />
    </div>
  );
}

const EMPTY_FORM = { currency: 'USD', amount: '', deals: '' };

/* Satış Raporu: the year's targets, editable by admins */
export default function SalesTargets() {
  const call = useAdminApi();
  const { can } = useAdminSession();
  const editor = can('settings');

  const [year, setYear] = useState(() => Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric' }).format(new Date())));
  const [rows, setRows] = useState(null);
  const [current, setCurrent] = useState('');
  const [editing, setEditing] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const response = await call(getSalesTargets, { from: `${year}-01`, to: `${year}-12` });
      setRows(response.data || []);
      setCurrent(response.currentMonth || '');
    } catch (err) {
      setError(err.message);
      setRows([]);
    }
  }, [call, year]);

  useEffect(() => {
    load();
  }, [load]);

  function edit(row) {
    // A new target starts from the previous month's currency
    const previous = [...(rows || [])].reverse().find((item) => item.month < row.month && item.target);
    setEditing(row.month);
    setForm(row.target
      ? { currency: row.target.currency, amount: row.target.amount ? String(row.target.amount) : '', deals: row.target.deals ? String(row.target.deals) : '' }
      : { ...EMPTY_FORM, currency: previous?.target.currency || 'USD' });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await call(saveSalesTarget, editing, {
        currency: form.currency,
        amount: parseAmount(form.amount) || 0,
        deals: form.deals === '' ? 0 : Number(form.deals),
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
    if (!window.confirm(`${monthName(month)} hedefi silinsin mi?`)) return;
    setSaving(true);
    setError('');
    try {
      await call(deleteSalesTarget, month);
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
        <div className="adYearSwitch">
          <button type="button" className="adIconButton" onClick={() => setYear(year - 1)} aria-label="Önceki yıl"><ChevronLeft aria-hidden="true" /></button>
          <strong>{year}</strong>
          <button type="button" className="adIconButton" onClick={() => setYear(year + 1)} aria-label="Sonraki yıl"><ChevronRight aria-hidden="true" /></button>
        </div>
      </div>

      {error && <div className="adminInlineError" role="alert">{error}</div>}
      {rows === null && <div className="adSkeletonList" aria-label="Yükleniyor"><span /><span /></div>}

      {rows !== null && (
        <>
          {now?.target && (
            <div className="adTargetHero">
              <span className="adTargetHeroLabel">{monthName(now.month)} · {daysLeft(now.month)} gün kaldı</span>
              <MonthProgress row={now} />
            </div>
          )}

          {!anyTarget && (
            <p className="adNotesEmpty">
              {editor
                ? `${year} için henüz hedef yok. Bir ayın satırındaki “Hedef Belirle” ile tutar ve/veya kazanılacak talep sayısı girin.`
                : `${year} için henüz hedef belirlenmedi. Hedefleri Yönetici rolündeki kullanıcılar belirler.`}
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
              const amountShare = target?.amount ? share(row.achieved || 0, target.amount) : target?.deals ? share(row.won, target.deals) : null;
              const future = current && row.month > current;

              if (editing === row.month) {
                return (
                  <form key={row.month} className="adTargetRow editing" role="row" onSubmit={save}>
                    <span role="cell" className="adTargetMonth">{monthName(row.month, 'short')}</span>
                    <span role="cell" className="adTargetForm">
                      <Dropdown className="adDd" value={form.currency} onChange={(currency) => setForm({ ...form, currency })} label="Para birimi" options={OFFER_CURRENCIES.map((value) => ({ value, label: value }))} />
                      <input type="text" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Tutar (KDV hariç)" aria-label="Hedef tutar, KDV hariç" />
                      <input type="number" min="0" step="1" value={form.deals} onChange={(event) => setForm({ ...form, deals: event.target.value })} placeholder="Talep sayısı" aria-label="Kazanılacak talep sayısı" />
                    </span>
                    <span role="cell" className="adTargetActions">
                      <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving || (!form.amount && !form.deals)}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
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
                  <span role="cell">
                    {target
                      ? [target.amount ? formatMoney(target.amount, target.currency) : '', target.deals ? `${target.deals} talep` : ''].filter(Boolean).join(' · ')
                      : <span className="adMuted">—</span>}
                  </span>
                  <span role="cell">
                    {future
                      ? <span className="adMuted">—</span>
                      : target?.amount
                        ? formatMoney(row.achieved || 0, target.currency)
                        : row.byCurrency.length ? row.byCurrency.map((item) => formatMoney(item.value, item.currency)).join(' · ') : <span className="adMuted">0</span>}
                  </span>
                  <span role="cell" className="adTargetShare">
                    {target && !future ? (
                      <>
                        <Bar value={amountShare} />
                        <small>{pct(amountShare)}</small>
                      </>
                    ) : <span className="adMuted">—</span>}
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
            Gerçekleşen: o ay “Kazanıldı” olarak işaretlenen taleplerin proforma tutarı (KDV hariç), hedefin para biriminde. Proformasız kazanılan talepler yalnızca talep sayısına eklenir.
          </small>
        </>
      )}
    </div>
  );
}
