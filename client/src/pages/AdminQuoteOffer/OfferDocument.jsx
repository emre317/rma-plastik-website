import { forwardRef } from 'react';

import logoPng from '../../assets/brand/rma-logo.png';
import { quoteReference } from '../../components/admin/quoteStatus';
import {
  formatMoney, formatOfferDate, offerCopy, offerNumber, offerTotals,
} from '../../data/offerText';

/*
  The offer as an A4 document (794 px wide = 210 mm at 96 dpi). Used for the
  live preview and, rendered at full size, for the PDF. Elements marked with
  data-break are safe places to start a new page.
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
  ].filter(([, value]) => value);

  const address = [company.street, company.district, company.country].filter(Boolean).join(', ');

  return (
    <article ref={ref} className="ofDoc" dir={dir} lang={lang}>
      <header className="ofHead" data-break>
        <div className="ofBrand">
          <img src={logoPng} alt="RMA Plastik" />
          <div className="ofCompany">
            <strong dir="auto">{company.legalName || 'RMA Plastik'}</strong>
            {address && <span dir="auto">{address}</span>}
            <span dir="ltr">{[company.phone, company.email].filter(Boolean).join(' · ')}</span>
            {company.website && <span dir="ltr">{company.website}</span>}
            {company.taxInfo && <span dir="auto">{company.taxInfo}</span>}
          </div>
        </div>

        <div className="ofTitle">
          <h1>{copy.title}</h1>
          <dl>
            <div><dt>{copy.number}</dt><dd dir="ltr">{offerNumber(quote._id, offer.revision)}</dd></div>
            <div><dt>{copy.date}</dt><dd>{today}</dd></div>
            {offer.validUntil && <div><dt>{copy.validUntil}</dt><dd>{formatOfferDate(`${offer.validUntil}T12:00:00+03:00`, lang)}</dd></div>}
            <div><dt>{copy.reference}</dt><dd dir="ltr">{quoteReference(quote._id)}</dd></div>
          </dl>
        </div>
      </header>

      <section className="ofCustomer" data-break>
        <span className="ofLabel">{copy.to}</span>
        <strong dir="auto">{quote.company}</strong>
        <span dir="auto">{[quote.name, quote.country].filter(Boolean).join(' · ')}</span>
        <span dir="ltr">{[quote.email, quote.phone].filter(Boolean).join(' · ')}</span>
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
              <td className="ofNum">{index + 1}</td>
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

      <div className="ofTotals" data-break>
        <dl>
          {totals.hasVat && (
            <>
              <div><dt>{copy.subtotal}</dt><dd dir="ltr">{money(totals.subtotal)}</dd></div>
              <div><dt>{copy.vat} (%{offer.vatRate})</dt><dd dir="ltr">{money(totals.vat)}</dd></div>
            </>
          )}
          <div className="ofGrand"><dt>{copy.total}</dt><dd dir="ltr">{money(totals.total)}</dd></div>
        </dl>
      </div>

      {terms.length > 0 && (
        <section className="ofBlock" data-break>
          <h2>{copy.conditions}</h2>
          <dl className="ofTerms">
            {terms.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {offer.notes && (
        <section className="ofBlock" data-break>
          <h2>{copy.notes}</h2>
          <p dir="auto">{offer.notes}</p>
        </section>
      )}

      {offer.terms && (
        <section className="ofBlock ofSmall" data-break>
          <h2>{copy.terms}</h2>
          <p dir="auto">{offer.terms}</p>
        </section>
      )}

      {company.bankInfo && (
        <section className="ofBlock ofSmall" data-break>
          <h2>{copy.bank}</h2>
          <p dir="ltr">{company.bankInfo}</p>
        </section>
      )}

      <footer className="ofFoot" data-break>
        {offer.preparedBy && <span><em>{copy.preparedBy}:</em> <bdi>{offer.preparedBy}</bdi></span>}
        <span dir="ltr">{[company.phone, company.email, company.website].filter(Boolean).join(' · ')}</span>
      </footer>
    </article>
  );
});

export default OfferDocument;
