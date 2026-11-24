import { forwardRef } from 'react';
import { Check, Package } from 'lucide-react';

import BrandLogo from '../../components/BrandLogo';
import { SITE_URL } from '../../seo/site';
import company from '../../data/company';
import formatNumber from '../../utils/formatNumber';
import { familyText, modelPath } from '../../data/productTables';
import { productStandard, productText } from '../../data/productFeatures';

// Longer feature lists leave the side column (see ProductDatasheet.jsx)
const WIDE_FEATURES_FROM = 8;

/*
  The printable A4 sheet itself, split out of ProductDatasheet.jsx so it can
  be reused off-screen: AdminQuoteOffer.jsx captures this exact markup with
  html2canvas (datasheetPdf.js) to attach a technical datasheet to a sent
  proforma that looks identical to the one a customer could save from the
  site themselves — not a re-drawn approximation of it.

  Unlike the routed page, `lang` and `t` are explicit props rather than the
  current route's language: a proforma can be in a different language than
  whoever is sending it is browsing the admin panel in (pass
  `i18n.getFixedT(lang)` as `t`).
*/
const DatasheetDocument = forwardRef(function DatasheetDocument({ family, row, lang, t }, ref) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const title = familyText(family, 'title', lang, t);
  const text = productText(family, row, lang, t);
  const image = row.image || family.image;
  const num = (value) => formatNumber(value, lang);
  const col = (key) => t(`productTables.columns.${key}`);
  const d = (key, options) => t(`datasheet.${key}`, options);

  const columns = (family.columns || []).filter((key) => key !== 'code' && row[key] !== undefined && row[key] !== '');
  const specs = [
    { key: 'code', label: t('productModel.codeLabel'), value: row.code },
    { key: 'family', label: t('productModel.familyLabel'), value: title },
    ...(family.waterTank
      ? [{ key: 'type', label: t('waterTanks.orientation'), value: [t(`waterTanks.${family.waterTank.orientation}`), t(`waterTanks.${family.waterTank.layer}`)].join(' · ') }]
      : []),
    // Numbers and inch marks (3/4") keep their order on the Arabic sheet
    ...columns.map((key) => ({ key, label: col(key), value: <bdi dir="ltr">{num(row[key])}</bdi> })),
    { key: 'material', label: t('productModel.materialLabel'), value: t('productModel.materialValue') },
  ];

  const headline = ['volume', 'diameter', 'width', 'length', 'height', 'weight'].filter((key) => columns.includes(key)).slice(0, 4);
  const uses = family.waterTank?.uses || [];
  const standard = productStandard(family, row, lang, t);
  const showFeatures = standard.items.length > 0;
  // More than fits beside the table: full width, two columns
  const wideFeatures = standard.items.length > WIDE_FEATURES_FROM;
  const features = showFeatures && (
    <div className={wideFeatures ? 'dsFeaturesWide' : undefined}>
      <h2>{standard.title}</h2>
      <ul className="dsChecks">
        {standard.items.map((feature) => (
          <li key={feature}><Check aria-hidden="true" /><span>{feature}</span></li>
        ))}
      </ul>
    </div>
  );
  const sideFeatures = wideFeatures ? null : features;
  const capacity = typeof row.volume === 'number' ? `${num(row.volume)} L` : '';
  const pagePath = `/${lang}${modelPath(family, row)}`;
  const pageUrl = `${SITE_URL}${pagePath}`;
  const issued = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : lang, { dateStyle: 'long' }).format(new Date());
  const address = [company.address.street, company.address.district, company.address.country].join(', ');

  return (
    <article ref={ref} className={wideFeatures ? 'dsSheet dsSheetWide' : 'dsSheet'} aria-label={`${row.code} – ${d('title')}`} dir={dir}>
      <header className="dsHead">
        <BrandLogo className="dsLogo" />
        <div className="dsHeadMeta">
          <strong>{d('title')}</strong>
          <span>{d('issued')}: {issued}</span>
        </div>
      </header>

      <section className="dsHero">
        <div className="dsPhoto">
          {image ? <img src={image} alt={`${row.code} – ${title}`} /> : <Package aria-hidden="true" />}
        </div>

        <div className="dsIntro">
          <span className="dsFamily">{title}</span>
          <h1>
            {row.code}
            {capacity && <span dir="ltr">{capacity}</span>}
          </h1>
          {text && <p>{text}</p>}

          {headline.length > 0 && (
            <dl className="dsHighlights">
              {headline.map((key) => (
                <div key={key}>
                  <dt>{col(key)}</dt>
                  <dd><bdi dir="ltr">{num(row[key])}</bdi></dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className={wideFeatures ? 'dsBody dsBodyWide' : 'dsBody'}>
        <div className="dsSpecs">
          <h2>{t('productModel.specsTitle')}</h2>
          <table>
            <tbody>
              {specs.map((spec) => (
                <tr key={spec.key}>
                  <th scope="row">{spec.label}</th>
                  <td>{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(uses.length > 0 || sideFeatures) && (
          <div className="dsSide">
            {uses.length > 0 && (
              <div>
                <h2>{t('productModel.usesTitle')}</h2>
                <ul className="dsTags">
                  {uses.map((use) => <li key={use}>{t(`waterTanks.uses.${use}`)}</li>)}
                </ul>
              </div>
            )}

            {sideFeatures}
          </div>
        )}
      </section>

      {wideFeatures && features}

      <p className="dsNote dsTolerance"><strong>{t('common.tolerance')}</strong></p>
      <p className="dsNote">{d('note')}</p>

      <footer className="dsFoot">
        <div>
          <strong>{d('contact')}</strong>
          <span dir="ltr">{company.phone.display}</span>
          <span>{company.email}</span>
        </div>
        <div>
          <strong>RMA Plastik</strong>
          <span>{address}</span>
        </div>
        <div>
          <strong>{d('page')}</strong>
          <span className="dsUrl" dir="ltr">{pageUrl.replace(/^https?:\/\//, '')}</span>
        </div>
      </footer>
    </article>
  );
});

export default DatasheetDocument;
