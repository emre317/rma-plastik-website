import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Banknote, Download, Flag, FlaskConical, Globe2, LogIn, MapPin, Megaphone, Package, Target, UserRound,
} from 'lucide-react';

import { getQuoteReport } from '../../services/adminApi';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { LANGUAGE_LABELS, QUOTE_STATUSES, lossReasonLabel, todayValue } from '../../components/admin/quoteStatus';
import { formatMoney } from '../../data/offerText';
import { exportReportFile } from '../AdminQuotes/quoteExcel';
import SalesTargets from '../../components/admin/SalesTargets';

const nf = new Intl.NumberFormat('tr-TR');
const pf = new Intl.NumberFormat('tr-TR', { style: 'percent', maximumFractionDigits: 0 });

// "2026-03" -> "Mar 2026"
const monthLabel = (month, style = 'short') => {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('tr-TR', { month: style, year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, number - 1, 1)));
};

// "2026-03" -> "Mar" (the year is shown under the first column and every January)
const shortMonth = (month) => {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('tr-TR', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, number - 1, 1)));
};

const shiftMonths = (months) => {
  const [year, month] = todayValue().split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 - months + 1, 1));
  return date.toISOString().slice(0, 10);
};

const year = Number(todayValue().slice(0, 4));

const RANGES = [
  { id: '3m', label: 'Son 3 ay', from: () => shiftMonths(3) },
  { id: '6m', label: 'Son 6 ay', from: () => shiftMonths(6) },
  { id: '12m', label: 'Son 12 ay', from: () => shiftMonths(12) },
  { id: 'ytd', label: 'Bu Yıl', from: () => `${year}-01-01` },
  { id: 'last', label: 'Geçen Yıl', from: () => `${year - 1}-01-01`, to: () => `${year - 1}-12-31` },
  { id: 'all', label: 'Tümü', from: () => '' },
];

// Every month between two "YYYY-MM" values, inclusive
function monthsBetween(first, last) {
  const months = [];
  let [y, m] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);

  while ((y < ly || (y === ly && m <= lm)) && months.length < 120) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return months;
}

/* Ranked horizontal bars (one series): label, bar, value */
function RankList({ rows, label, value, suffix, link, limit = 10 }) {
  const [expanded, setExpanded] = useState(false);
  const max = Math.max(1, ...rows.map(value));
  const shown = expanded ? rows : rows.slice(0, limit);

  if (!rows.length) return <p className="adEmpty">Bu dönemde veri yok.</p>;

  return (
    <>
      <ol className="adRank">
        {shown.map((row) => {
          const name = label(row);
          const content = (
            <>
              <span className="adRankName" title={name}>{name}</span>
              <span className="adRankTrack" aria-hidden="true">
                <span style={{ width: `${(value(row) / max) * 100}%` }} />
              </span>
              <span className="adRankValue">{nf.format(value(row))}{suffix ? <small>{suffix(row)}</small> : null}</span>
            </>
          );

          const to = link?.(row);
          return <li key={name}>{to ? <Link to={to}>{content}</Link> : <div>{content}</div>}</li>;
        })}
      </ol>
      {rows.length > limit && (
        <button type="button" className="adRankMore" onClick={() => setExpanded((open) => !open)}>
          {expanded ? 'Daha az göster' : `Tümünü göster (${rows.length})`}
        </button>
      )}
    </>
  );
}

/* Sales report: requests by month, country, product, status and assignee */
export default function AdminQuoteReports() {
  usePageTitle('Satış Raporu');

  const call = useAdminApi();

  const [range, setRange] = useState('12m');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [hover, setHover] = useState(null);

  const period = useMemo(() => {
    if (range === 'custom') return { from: custom.from, to: custom.to };
    const preset = RANGES.find((item) => item.id === range);
    return { from: preset.from(), to: preset.to ? preset.to() : '' };
  }, [range, custom]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const response = await call(getQuoteReport, period);
        if (!cancelled) setReport(response.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, period.from, period.to]);

  // Months with no requests are shown as empty columns
  const months = useMemo(() => {
    if (!report) return [];
    const found = new Map(report.byMonth.map((row) => [row.month, row]));
    const first = period.from ? period.from.slice(0, 7) : report.byMonth[0]?.month;
    const last = period.to ? period.to.slice(0, 7) : todayValue().slice(0, 7);
    if (!first) return [];
    return monthsBetween(first, last).map((month) => found.get(month) || { month, count: 0, quoted: 0 });
  }, [report, period.from, period.to]);

  const quotedTotal = report ? report.byMonth.reduce((sum, row) => sum + row.quoted, 0) : 0;
  const countries = report ? report.byCountry.filter((row) => row.country !== 'Belirtilmemiş').length : 0;
  const topProduct = report?.byProduct.find((row) => row.name !== 'Genel Talep');
  const maxMonth = Math.max(1, ...months.map((row) => row.count));
  const ticks = [maxMonth, Math.round(maxMonth / 2), 0].filter((tick, index, all) => all.indexOf(tick) === index);
  const statusCount = (id) => report?.byStatus.find((row) => row.status === id)?.count || 0;
  const won = report?.outcomes?.won || 0;
  const lost = report?.outcomes?.lost || 0;
  const decided = won + lost;

  const rangeLabel = range === 'custom'
    ? [custom.from || 'başlangıç', custom.to || 'bugün'].join(' – ')
    : RANGES.find((item) => item.id === range)?.label;

  async function download() {
    setExporting(true);

    try {
      await exportReportFile({ ...report, byMonth: months, quotedTotal, won, lost }, { rangeLabel, monthLabel: (month) => monthLabel(month, 'long') });
    } catch (err) {
      setError(err.message || 'Rapor indirilemedi.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="adminContent adReport">
      <Link to="/admin/quotes" className="adBack"><ArrowLeft aria-hidden="true" />Teklif Talepleri</Link>

      <header className="adPageHead">
        <div>
          <span className="adEyebrow">Satış</span>
          <h1>Satış Raporu</h1>
          <p>Siteden gelen teklif taleplerinin aya, ülkeye, ürüne, kanala ve sorumluya göre dağılımı; kazanma oranı ve proforma tutarları. Tarihler talebin geldiği güne göredir.</p>
        </div>
        <button type="button" className="cmsButton cmsButtonInfo" onClick={download} disabled={!report || exporting || !report.total}>
          <Download aria-hidden="true" />
          {exporting ? 'Hazırlanıyor…' : 'Excel’e aktar'}
        </button>
      </header>

      <SalesTargets />

      <div className="adReportFilters">
        <div className="adSegment" role="group" aria-label="Dönem">
          {RANGES.map((item) => (
            <button key={item.id} type="button" className={range === item.id ? 'active' : ''} aria-pressed={range === item.id} onClick={() => setRange(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="adDateRange">
          <input type="date" value={range === 'custom' ? custom.from : period.from} max={custom.to || undefined} aria-label="Başlangıç tarihi" onChange={(event) => { setCustom({ ...custom, from: event.target.value, to: range === 'custom' ? custom.to : period.to }); setRange('custom'); }} />
          <span aria-hidden="true">–</span>
          <input type="date" value={range === 'custom' ? custom.to : period.to} min={custom.from || undefined} aria-label="Bitiş tarihi" onChange={(event) => { setCustom({ from: range === 'custom' ? custom.from : period.from, to: event.target.value }); setRange('custom'); }} />
        </div>
      </div>

      {error && <div className="adminInlineError" role="alert">{error}</div>}

      {loading && !report && <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>}

      {report && (
        <div className={`adReportBody ${loading ? 'loading' : ''}`}>
          <div className="adRepKpis">
            <div className="adRepKpi">
              <span>Toplam Talep</span>
              <strong>{nf.format(report.total)}</strong>
              <small>{rangeLabel}</small>
            </div>
            <div className="adRepKpi">
              <span>Teklif verildi / kapandı</span>
              <strong>{nf.format(quotedTotal)}</strong>
              <small>{report.total ? `Taleplerin ${pf.format(quotedTotal / report.total)}’i` : '—'}</small>
            </div>
            <div className="adRepKpi">
              <span>Ülke</span>
              <strong>{nf.format(countries)}</strong>
              <small>{report.byCountry[0] && report.byCountry[0].country !== 'Belirtilmemiş' ? `En çok: ${report.byCountry[0].country}` : 'Ülkesi belirtilen talep'}</small>
            </div>
            <div className="adRepKpi">
              <span>En çok istenen</span>
              <strong className="adRepKpiText" title={topProduct?.name}>{topProduct?.name || '—'}</strong>
              <small>{topProduct ? `${nf.format(topProduct.requests)} talep · ${nf.format(topProduct.pieces)} adet` : 'Ürün seçilen talep yok'}</small>
            </div>
          </div>

          <div className="adRepKpis">
            <div className="adRepKpi accent">
              <span>Kazanma Oranı</span>
              <strong>{decided ? pf.format(won / decided) : '—'}</strong>
              <small>{decided ? `Sonuçlanan ${nf.format(decided)} talepten` : 'Henüz sonuçlanan talep yok'}</small>
            </div>
            <div className="adRepKpi">
              <span>Kazanılan</span>
              <strong>{nf.format(won)}</strong>
              <small><Link to="/admin/quotes?outcome=won">Talepleri gör</Link></small>
            </div>
            <div className="adRepKpi">
              <span>Kaybedilen</span>
              <strong>{nf.format(lost)}</strong>
              <small>{report.byLossReason[0] ? `En sık neden: ${lossReasonLabel(report.byLossReason[0].reason)}` : <Link to="/admin/quotes?outcome=lost">Talepleri gör</Link>}</small>
            </div>
            <div className="adRepKpi">
              <span>Sonuçlanmamış</span>
              <strong>{nf.format(Math.max(0, report.total - decided))}</strong>
              <small><Link to="/admin/quotes?outcome=open">Açık talepleri gör</Link></small>
            </div>
          </div>

          {/* Proforma amounts per currency */}
          <div className="adCard">
            <div className="adCardHead">
              <h2><Banknote aria-hidden="true" />Proforma Tutarları</h2>
              <span className="adHint">KDV hariç · para birimine göre</span>
            </div>
            {report.byCurrency.length ? (
              <div className="adMoneyTable" role="table" aria-label="Proforma tutarları">
                <div className="adMoneyRow head" role="row">
                  <span role="columnheader">Para Birimi</span>
                  <span role="columnheader">Proforma</span>
                  <span role="columnheader">Teklif Edilen</span>
                  <span role="columnheader">Ortalama</span>
                  <span role="columnheader">Kazanılan</span>
                  <span role="columnheader">Kaybedilen</span>
                </div>
                {report.byCurrency.map((row) => (
                  <div key={row.currency} className="adMoneyRow" role="row">
                    <span role="cell"><strong>{row.currency}</strong></span>
                    <span role="cell">{nf.format(row.offers)}<small>{nf.format(row.sent)} gönderildi</small></span>
                    <span role="cell" dir="ltr">{formatMoney(row.offered, row.currency, 'tr')}</span>
                    <span role="cell" dir="ltr">{formatMoney(row.average, row.currency, 'tr')}</span>
                    <span role="cell" className="won">
                      <span dir="ltr">{formatMoney(row.wonValue, row.currency, 'tr')}</span>
                      <small>{nf.format(row.won)} proforma{row.offered ? ` · tutarın ${pf.format(row.wonValue / row.offered)}’i` : ''}</small>
                    </span>
                    <span role="cell" className="lost">
                      <span dir="ltr">{formatMoney(row.lostValue, row.currency, 'tr')}</span>
                      <small>{nf.format(row.lost)} proforma</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="adEmpty">Bu dönemde fiyatlı proforma yok. Proformalar talebin detayından hazırlanır.</p>
            )}
          </div>

          {/* Requests per month (single series) */}
          <div className="adCard">
            <div className="adCardHead">
              <h2>Aylık teklif talepleri</h2>
              <span className="adHint">Sütunun üzerine gelince ayrıntı görünür</span>
            </div>

            {months.length ? (
              <div className="adColumns" role="table" aria-label="Aylık teklif talepleri">
                <div className="adColumnsAxis" aria-hidden="true">
                  {ticks.map((tick) => <span key={tick} style={{ bottom: `${(tick / maxMonth) * 100}%` }}>{nf.format(tick)}</span>)}
                </div>
                <div className="adColumnsPlot" onMouseLeave={() => setHover(null)}>
                  {ticks.map((tick) => <i key={tick} className="adColumnsGrid" style={{ bottom: `${(tick / maxMonth) * 100}%` }} aria-hidden="true" />)}
                  {months.map((row, index) => (
                    <div
                      key={row.month}
                      role="row"
                      className={`adColumn ${hover === index ? 'active' : ''}`}
                      tabIndex={0}
                      onMouseEnter={() => setHover(index)}
                      onFocus={() => setHover(index)}
                      onBlur={() => setHover(null)}
                    >
                      <span className="adColumnBar" style={{ height: `${(row.count / maxMonth) * 100}%` }} aria-hidden="true" />
                      <span className="adColumnLabel" role="cell">
                        {shortMonth(row.month)}
                        {(index === 0 || row.month.endsWith('-01')) && <em>{row.month.slice(0, 4)}</em>}
                      </span>
                      <span className="visuallyHidden" role="cell">{row.count} talep, {row.quoted} teklif verildi veya kapandı</span>
                      {hover === index && (
                        <span className={`adColumnTip ${index > months.length / 2 ? 'left' : ''}`} role="tooltip">
                          <strong>{monthLabel(row.month, 'long')}</strong>
                          <span><em>Talep</em>{nf.format(row.count)}</span>
                          <span><em>Teklif verildi / kapandı</em>{nf.format(row.quoted)}</span>
                          {row.count > 0 && <span><em>Oran</em>{pf.format(row.quoted / row.count)}</span>}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="adEmpty">Bu dönemde talep yok.</p>
            )}
          </div>

          <div className="adReportGrid">
            <div className="adCard">
              <div className="adCardHead">
                <h2><Globe2 aria-hidden="true" />Ülkeler</h2>
                <span className="adHint">Talep Sayısı</span>
              </div>
              <RankList
                rows={report.byCountry}
                label={(row) => row.country}
                value={(row) => row.count}
                suffix={(row) => pf.format(row.count / Math.max(1, report.total))}
                link={(row) => (row.country === 'Belirtilmemiş' ? '/admin/quotes' : `/admin/quotes?q=${encodeURIComponent(row.country)}`)}
              />
            </div>

            <div className="adCard">
              <div className="adCardHead">
                <h2><FlaskConical aria-hidden="true" />Stoklanacak Ürün</h2>
                <span className="adHint">Belirtilen talepler</span>
              </div>
              <RankList
                rows={report.byStored || []}
                label={(row) => row.stored}
                value={(row) => row.count}
                suffix={(row) => pf.format(row.count / Math.max(1, (report.byStored || []).reduce((sum, item) => sum + item.count, 0)))}
                link={(row) => `/admin/quotes?q=${encodeURIComponent(row.stored)}`}
              />
            </div>

            <div className="adCard">
              <div className="adCardHead">
                <h2><MapPin aria-hidden="true" />Teslimat Şehri</h2>
                <span className="adHint">Talep Sayısı</span>
              </div>
              <RankList
                rows={report.byCity || []}
                label={(row) => row.city}
                value={(row) => row.count}
                suffix={(row) => pf.format(row.count / Math.max(1, report.total))}
                link={(row) => `/admin/quotes?q=${encodeURIComponent(row.city)}`}
              />
            </div>

            <div className="adCard">
              <div className="adCardHead">
                <h2><Package aria-hidden="true" />Ürünler</h2>
                <span className="adHint">Talep · toplam adet</span>
              </div>
              <RankList
                rows={report.byProduct}
                label={(row) => row.name}
                value={(row) => row.requests}
                suffix={(row) => `${nf.format(row.pieces)} adet`}
                link={(row) => (row.name === 'Genel Talep' ? null : `/admin/quotes?q=${encodeURIComponent(row.name)}`)}
              />
            </div>

            <div className="adCard">
              <div className="adCardHead"><h2>Durumlar</h2></div>
              <ul className="adStatusBreak">
                {QUOTE_STATUSES.map((status) => {
                  const count = statusCount(status.id);
                  return (
                    <li key={status.id} className={`tone-${status.tone}`}>
                      <Link to={`/admin/quotes?status=${status.id}`}>
                        <span className="adStatusDot" aria-hidden="true" />
                        <span className="adRankName">{status.label}</span>
                        <span className="adRankTrack" aria-hidden="true"><span style={{ width: `${report.total ? (count / report.total) * 100 : 0}%` }} /></span>
                        <span className="adRankValue">{nf.format(count)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="adCard">
              <div className="adCardHead">
                <h2><Megaphone aria-hidden="true" />Kanallar</h2>
                <span className="adHint">Talep · kazanılan</span>
              </div>
              <RankList
                rows={report.byChannel}
                label={(row) => row.channel}
                value={(row) => row.count}
                suffix={(row) => `${nf.format(row.won)} kazanıldı`}
                link={(row) => `/admin/quotes?channel=${encodeURIComponent(row.channel)}`}
              />
              <p className="adReportNote">Kanal, ziyaretçinin siteye ilk geldiği yerdir (Google araması, reklam, sosyal medya, e-posta…). Kaynak bilgisi bu özellik eklendikten sonraki taleplerde kaydedilir; önceki talepler “Doğrudan” sayılır.</p>
            </div>

            <div className="adCard">
              <div className="adCardHead">
                <h2><Flag aria-hidden="true" />Kayıp Nedenleri</h2>
                <span className="adHint">Kaybedilen talep</span>
              </div>
              <RankList
                rows={report.byLossReason}
                label={(row) => lossReasonLabel(row.reason) || 'Belirtilmemiş'}
                value={(row) => row.count}
                suffix={(row) => pf.format(row.count / Math.max(1, lost))}
              />
            </div>

            <div className="adCard">
              <div className="adCardHead">
                <h2><Target aria-hidden="true" />Kampanyalar</h2>
                <span className="adHint">utm_campaign · talep</span>
              </div>
              {report.byCampaign.length ? (
                <RankList
                  rows={report.byCampaign}
                  label={(row) => (row.source ? `${row.campaign} (${row.source})` : row.campaign)}
                  value={(row) => row.count}
                  suffix={(row) => `${nf.format(row.won)} kazanıldı`}
                />
              ) : (
                <p className="adEmpty">Kampanya etiketli talep yok. Reklam ve e-posta bağlantılarına utm_campaign eklendiğinde burada görünür.</p>
              )}
            </div>

            <div className="adCard">
              <div className="adCardHead">
                <h2><LogIn aria-hidden="true" />Giriş Sayfaları</h2>
                <span className="adHint">Ziyaretin ilk sayfası · talep</span>
              </div>
              <RankList rows={report.byLanding} label={(row) => row.page} value={(row) => row.count} />
            </div>

            <div className="adCard">
              <div className="adCardHead">
                <h2><UserRound aria-hidden="true" />Sorumlular</h2>
                <span className="adHint">Talep · açık</span>
              </div>
              <RankList
                rows={report.byAssignee}
                label={(row) => row.assignee || 'Atanmamış'}
                value={(row) => row.count}
                suffix={(row) => `${nf.format(row.open)} açık`}
                link={(row) => `/admin/quotes?assignee=${encodeURIComponent(row.assignee || '-')}`}
              />
              {report.byLanguage.length > 0 && (
                <p className="adReportNote">
                  Site dili: {report.byLanguage.map((row) => `${LANGUAGE_LABELS[row.language] || 'Belirtilmemiş'} ${nf.format(row.count)}`).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
