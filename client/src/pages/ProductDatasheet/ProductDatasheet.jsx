import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, FileDown, Package } from 'lucide-react';

import Seo from '../../seo/Seo';
import BrandLogo from '../../components/BrandLogo';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import { SITE_URL } from '../../seo/site';
import company from '../../data/company';
import useLanguage from '../../hooks/useLanguage';
import useModelQuote from '../../hooks/useModelQuote';
import formatNumber from '../../utils/formatNumber';
import { familyText, findModel, modelPath } from '../../data/productTables';
import { productStandard, productText } from '../../data/productFeatures';
import NotFound from '../NotFound/NotFound';

// Longer feature lists leave the side column (see below)
const WIDE_FEATURES_FROM = 8;

/*
  Printable A4 datasheet of one catalogue model:
  /tr/product-tables/vertical-tanks/rd-5000/datasheet
  The sheet opens as a page; "Save as PDF" uses the browser's print dialog, so
  Turkish and Arabic text render exactly as on the site.
  Only catalogue values are shown; empty columns are left out.
  A long feature list (group + family + model) is set in two columns across
  the sheet instead of the narrow side column, so it stays on one A4 page.
*/
export default function ProductDatasheet() {
  const { t } = useTranslation();
  const { code: lang, dir } = useLanguage();
  const { familyId, modelSlug } = useParams();
  const quoteFor = useModelQuote();

  const match = findModel(familyId, modelSlug);

  if (!match) return <NotFound />;

  const { family, row } = match;
  const product = quoteFor(family, row);
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
  const pagePath = `/${lang}${modelPath(family, row)}`;
  const pageUrl = `${SITE_URL}${pagePath}`;
  const issued = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : lang, { dateStyle: 'long' }).format(new Date());
  const address = [company.address.street, company.address.district, company.address.country].join(', ');

  return (
    <main className="dsPage" dir={dir}>
      <Seo title={`${row.code} – ${d('title')}`} description={`${row.code} ${title} – ${d('title')}`} noindex />

      <div className="dsToolbar">
        <LocalizedLink to={modelPath(family, row)} className="dsBack">
          <ArrowLeft aria-hidden="true" className="dsFlip" />
          {d('back')}
        </LocalizedLink>
        <div className="dsToolbarActions">
          <small>{d('saveHint')}</small>
          <button type="button" className="button primary" onClick={() => window.print()}>
            <FileDown aria-hidden="true" />
            <span>{d('save')}</span>
          </button>
        </div>
      </div>

      <article className={wideFeatures ? 'dsSheet dsSheetWide' : 'dsSheet'} aria-label={`${row.code} – ${d('title')}`}>
        <header className="dsHead">
          <BrandLogo className="dsLogo" />
          <div className="dsHeadMeta">
            <strong>{d('title')}</strong>
            {/* Today's date: differs from the prerendered page, which is fine */}
            <span suppressHydrationWarning>{d('issued')}: {issued}</span>
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
              {product.capacity && <span dir="ltr">{product.capacity}</span>}
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
    </main>
  );
}
