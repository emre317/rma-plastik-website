import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Banknote, Building2, CheckCircle2, Clock3, Download, Globe2, Inbox, Mail, MessageCircle, Phone, User, XCircle,
} from 'lucide-react';

import { getCustomer } from '../../services/adminApi';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { formatMoney } from '../../data/offerText';
import {
  formatDate, lossReasonLabel, outcomeLabel, quoteReference, statusLabel, statusTone, timeAgo,
} from '../../components/admin/quoteStatus';

const moneyList = (list) => (list?.length ? list.map((row) => formatMoney(row.value, row.currency)).join(' · ') : '—');

const productText = (quote) =>
  quote.items?.length
    ? quote.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')
    : quote.product || 'Genel Talep';

/* Customer card: every request from one e-mail address, and from the same company */
export default function AdminCustomer() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const company = params.get('company') || '';
  const back = params.get('from');

  const call = useAdminApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageTitle(data?.customer?.company ? `${data.customer.company} · Müşteri Kartı` : 'Müşteri Kartı');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const response = await call(getCustomer, { email, company });
        if (cancelled) return;
        if (!response.data?.customer || !Array.isArray(response.data.quotes)) throw new Error('Müşteri bilgileri yüklenemedi.');
        setData(response.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [call, email, company]);

  const customer = data?.customer;
  const summary = data?.summary;
  const quotes = data?.quotes || [];
  const lead = data?.lead;
  const phoneDigits = (customer?.phone || '').replace(/\D/g, '');

  return (
    <section className="adminContent adCustomer">
      <Link to={back ? `/admin/quotes/${back}` : '/admin/quotes'} className="adBack">
        <ArrowLeft aria-hidden="true" />
        {back ? 'Talebe Dön' : 'Teklif Talepleri'}
      </Link>

      {loading && <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>}
      {!loading && error && <div className="adminInlineError" role="alert">{error}</div>}

      {!loading && customer && (
        <>
          <header className="adDetailHead">
            <div>
              <span className="adEyebrow">Müşteri Kartı</span>
              <h1>{customer.company || customer.name || customer.email}</h1>
              <p>
                {summary.total
                  ? `İlk talep ${formatDate(summary.firstAt)} · son talep ${timeAgo(summary.lastAt)}`
                  : 'Bu müşteriden kayıtlı talep yok.'}
                {summary.people > 1 && ` · bu firmadan ${summary.people} farklı kişi yazdı`}
              </p>
            </div>

            <div className="adContactActions">
              {customer.email && (
                <a className="cmsButton cmsButtonPrimary" href={`mailto:${customer.email}`}>
                  <Mail aria-hidden="true" />
                  E-posta Yaz
                </a>
              )}
              {customer.phone && (
                <a className="cmsButton" href={`tel:${customer.phone.replace(/\s/g, '')}`}>
                  <Phone aria-hidden="true" />
                  Ara
                </a>
              )}
              {phoneDigits.length >= 10 && (
                <a className="cmsButton adWhatsapp" href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden="true" />
                  WhatsApp
                </a>
              )}
            </div>
          </header>

          <div className="adKpis">
            <div className="adKpi">
              <span className="adKpiIcon" aria-hidden="true"><Inbox /></span>
              <span className="adKpiLabel">Talep</span>
              <strong>{summary.total}</strong>
              <small>{summary.open} açık</small>
            </div>
            <div className="adKpi">
              <span className="adKpiIcon" aria-hidden="true"><CheckCircle2 /></span>
              <span className="adKpiLabel">Kazanılan</span>
              <strong>{summary.won}</strong>
              <small>{summary.won + summary.lost ? `Sonuçlananların %${Math.round((summary.won / (summary.won + summary.lost)) * 100)}'i` : 'Sonuçlanan talep yok'}</small>
            </div>
            <div className="adKpi">
              <span className="adKpiIcon" aria-hidden="true"><XCircle /></span>
              <span className="adKpiLabel">Kaybedilen</span>
              <strong>{summary.lost}</strong>
              <small>{summary.lost ? 'Nedenleri aşağıdaki listede' : '—'}</small>
            </div>
            <div className="adKpi">
              <span className="adKpiIcon" aria-hidden="true"><Banknote /></span>
              <span className="adKpiLabel">Kazanılan Tutar</span>
              <strong className="adKpiMoney">{moneyList(summary.wonValue)}</strong>
              <small>Teklif edilen: {moneyList(summary.offered)} (KDV hariç)</small>
            </div>
          </div>

          <div className="adDetailGrid">
            <div className="adDetailMain">
              <div className="adCard">
                <div className="adCardHead">
                  <h2><Inbox aria-hidden="true" />Talepler</h2>
                  <span className="adHint">{quotes.length} kayıt{data.truncated ? ' (en yeni 200)' : ''}</span>
                </div>

                {quotes.length ? (
                  <ul className="adCustQuotes">
                    {quotes.map((quote) => (
                      <li key={quote._id}>
                        <Link to={`/admin/quotes/${quote._id}`}>
                          <span className="adCustQuoteMain">
                            <strong>{productText(quote)}</strong>
                            <small>
                              {quoteReference(quote._id)} · {formatDate(quote.createdAt)}
                              {quote.assignee && ` · ${quote.assignee}`}
                              {quote.match === 'company' && ` · ${quote.name} (${quote.email})`}
                            </small>
                          </span>
                          <span className="adCustQuoteMeta">
                            {quote.offer && (
                              <span className="adCustMoney">{formatMoney(quote.offer.subtotal, quote.offer.currency)}</span>
                            )}
                            <span className={`adPill tone-${statusTone(quote.status)}`}>{statusLabel(quote.status)}</span>
                            {quote.outcome && (
                              <span className={`adPill tone-${quote.outcome === 'won' ? 'green' : 'red'}`} title={lossReasonLabel(quote.lossReason) || undefined}>
                                {outcomeLabel(quote.outcome)}{quote.outcome === 'lost' && quote.lossReason ? `: ${lossReasonLabel(quote.lossReason)}` : ''}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="adNotesEmpty">Kayıtlı talep yok.</p>
                )}
              </div>
            </div>

            <aside className="adDetailSide">
              <div className="adCard">
                <div className="adCardHead"><h2>İletişim</h2></div>
                <ul className="adContactList">
                  <li><Building2 aria-hidden="true" /><span><small>Firma</small><strong>{customer.company || '—'}</strong></span></li>
                  <li><User aria-hidden="true" /><span><small>Yetkili</small><strong>{customer.name || '—'}</strong></span></li>
                  <li><Mail aria-hidden="true" /><span><small>E-posta</small>{customer.email ? <a href={`mailto:${customer.email}`}>{customer.email}</a> : <strong>—</strong>}</span></li>
                  <li><Phone aria-hidden="true" /><span><small>Telefon</small>{customer.phone ? <a href={`tel:${customer.phone.replace(/\s/g, '')}`} dir="ltr">{customer.phone}</a> : <strong>—</strong>}</span></li>
                  <li><Globe2 aria-hidden="true" /><span><small>Ülke</small><strong>{customer.country || '—'}</strong></span></li>
                </ul>
                <small className="cmsHint">Bilgiler bu adresten gelen en yeni talepten alınır.</small>
              </div>

              <div className="adCard">
                <div className="adCardHead"><h2><Download aria-hidden="true" />Katalog</h2></div>
                {lead ? (
                  <dl className="adFacts compact">
                    <div><dt>İndirme</dt><dd>{lead.downloads || 1} kez</dd></div>
                    <div><dt>İlk İndirme</dt><dd>{formatDate(lead.createdAt, true)}</dd></div>
                    <div><dt>Son İndirme</dt><dd>{formatDate(lead.lastDownloadAt, true)}</dd></div>
                    <div><dt>E-posta İzni</dt><dd>{lead.marketingConsent ? 'Var' : 'Yok'}</dd></div>
                  </dl>
                ) : (
                  <p className="adNotesEmpty">Bu adresle katalog indirilmedi.</p>
                )}
              </div>

              {summary.open > 0 && (
                <div className="adCard">
                  <div className="adCardHead"><h2><Clock3 aria-hidden="true" />Açık Talepler</h2></div>
                  <p className="adNotesEmpty">
                    {summary.open} talep henüz sonuçlanmadı. Aynı müşteriyle birden fazla kişi ilgileniyorsa sorumluyu tek kişide toplayın.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
