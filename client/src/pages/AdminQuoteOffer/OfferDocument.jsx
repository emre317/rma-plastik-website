import { forwardRef } from 'react';

import logoPng from '../../assets/brand/rma-logo.png';
import { quoteReference } from '../../components/admin/quoteStatus';
import {
  formatMoney, formatOfferDate, offerCopy, offerNumber, offerTotals,
} from '../../data/offerText';

/*
  The proforma invoice as an A4 document (794 px wide = 210 mm at 96 dpi).
  Used for the live preview and, rendered at full size, for the PDF.
  Elements marked with data-break are safe places to start a new page.
  Only what the sales team entered is shown; empty fields are left out.
*/
const OfferDocument = forwardRef(function OfferDocument({ quote, offer, company }, ref) {
  const lang = offer.language || 'tr';
  const copy = offerCopy(lang);
  const dir = copy.dir || 'ltr';
  const totals = offerTotals(offer);
  const money = (value) => formatMoney(value, offer.currency, lang);
  const hasDiscount = offer.lines.some((line) => Number(line.discount) > 0);
  const today = formatOfferDate(new Date(), lang);

  const terms = [
    [copy.incoterm, [offer.incoterm, offer.deliveryPlace].filter(Boolean).join(' – ')],
    [copy.deliveryTime, offer.deliveryTime],
    [copy.payment, offer.paymentTerms],
    [copy.origin, copy.originValue],
  ].filter(([, value]) => value);

  const address = [company.street, company.district, company.country].filter(Boolean).join(', ');

  const meta = [
    [copy.number, offerNumber(quote._id, offer.revision), 'ltr'],
    [copy.date, today],
    ...(offer.validUntil ? [[copy.validUntil, formatOfferDate(`${offer.validUntil}T12:00:00+03:00`, lang)]] : []),
    [copy.reference, quoteReference(quote._id), 'ltr'],
  ];

  return (
    <article ref={ref} className="ofDoc" dir={dir} lang={lang}>
      <div className="ofBand" aria-hidden="true"><span /></div>

      <header className="ofHead" data-break>
        <img className="ofLogo" src={logoPng} alt="RMA Plastik" />

        <div className="ofTitle">
          <h1>{copy.title}</h1>
          <dl className="ofMeta">
            {meta.map(([label, value, valueDir]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd dir={valueDir}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <section className="ofParties" data-break>
        <div className="ofParty">
          <span className="ofLabel">{copy.seller}</span>
          <strong dir="auto">{company.legalName || 'RMA Plastik'}</strong>
          {address && <span dir="auto">{address}</span>}
          {company.phone && <span dir="ltr">{company.phone}</span>}
          <span dir="ltr">{[company.email, company.website].filter(Boolean).join(' · ')}</span>
          {company.taxInfo && <span dir="auto">{company.taxInfo}</span>}
        </div>

        <div className="ofParty ofBuyer">
          <span className="ofLabel">{copy.buyer}</span>
          <strong dir="auto">{quote.company}</strong>
          {quote.name && <span dir="auto">{quote.name}</span>}
          {quote.country && <span dir="auto">{quote.country}</span>}
          {quote.email && <span dir="ltr">{quote.email}</span>}
          {quote.phone && <span dir="ltr">{quote.phone}</span>}
        </div>
      </section>

      <table className="ofLines">
        <thead>
          <tr data-break>
            <th className="ofNum">#</th>
            <th>{copy.item}</th>
            <th className="ofRight">{copy.qty}</th>
            <th className="ofRight">{copy.unitPrice}</th>
            {hasDiscount && <th className="ofRight">{copy.discount}</th>}
            <th className="ofRight">{copy.amount}</th>
          </tr>
        </thead>
        <tbody>
          {offer.lines.map((line, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index} data-break>
              <td className="ofNum">{String(index + 1).padStart(2, '0')}</td>
              <td>
                <strong dir="auto">{line.name || '—'}</strong>
                {line.details && <small dir="auto">{line.details}</small>}
              </td>
              <td className="ofRight" dir="ltr">{line.quantity} {line.unit || copy.unit}</td>
              <td className="ofRight" dir="ltr">{money(line.unitPrice)}</td>
              {hasDiscount && <td className="ofRight" dir="ltr">{Number(line.discount) ? `%${line.discount}` : '—'}</td>}
              <td className="ofRight ofAmount" dir="ltr">{money(totals.lines[index])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="ofSummary" data-break>
        <dl className="ofTerms">
          <dt className="ofLabel ofTermsTitle">{copy.conditions}</dt>
          {terms.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd dir="auto">{value}</dd>
            </div>
          ))}
        </dl>

        <dl className="ofTotals">
          {totals.hasVat && (
            <>
              <div><dt>{copy.subtotal}</dt><dd dir="ltr">{money(totals.subtotal)}</dd></div>
              <div><dt>{copy.vat} %{offer.vatRate}</dt><dd dir="ltr">{money(totals.vat)}</dd></div>
            </>
          )}
          <div className="ofGrand">
            <dt>{copy.total} <small>({offer.currency})</small></dt>
            <dd dir="ltr">{money(totals.total)}</dd>
          </div>
        </dl>
      </section>

      {offer.notes && (
        <section className="ofBlock" data-break>
          <h2 className="ofLabel">{copy.notes}</h2>
          <p dir="auto">{offer.notes}</p>
        </section>
      )}

      {offer.terms && (
        <section className="ofBlock ofSmall" data-break>
          <h2 className="ofLabel">{copy.terms}</h2>
          <p dir="auto">{offer.terms}</p>
        </section>
      )}

      {company.bankInfo && (
        <section className="ofBlock ofBank" data-break>
          <h2 className="ofLabel">{copy.bank}</h2>
          <p dir="ltr">{company.bankInfo}</p>
        </section>
      )}

      <section className="ofSign" data-break>
        <div className="ofPrepared">
          {offer.preparedBy && (
            <>
              <span className="ofLabel">{copy.preparedBy}</span>
              <strong><bdi>{offer.preparedBy}</bdi></strong>
            </>
          )}
          <span dir="ltr">{[company.phone, company.email].filter(Boolean).join(' · ')}</span>
        </div>
        <div className="ofStamp">
          <span />
          <small>{copy.signature}</small>
        </div>
      </section>

      <footer className="ofFoot" data-break>
        <span>{copy.disclaimer}</span>
        <span dir="ltr">{[company.legalName || 'RMA Plastik', company.website].filter(Boolean).join(' · ')}</span>
      </footer>
    </article>
  );
});

export default OfferDocument;
