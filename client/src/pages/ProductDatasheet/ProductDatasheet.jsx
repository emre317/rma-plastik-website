import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
import NotFound from '../NotFound/NotFound';

/*
  Printable A4 datasheet of one catalogue model:
  /tr/product-tables/vertical-tanks/rd-5000/datasheet
  "Save as PDF" uses the browser's print dialog, so Turkish and Arabic text
  render exactly as on the site. With ?print=1 the dialog opens by itself.
  Only catalogue values are shown; empty columns are left out.
*/
export default function ProductDatasheet() {
  const { t } = useTranslation();
  const { code: lang, dir } = useLanguage();
  const { familyId, modelSlug } = useParams();
  const [searchParams] = useSearchParams();
  const quoteFor = useModelQuote();
  const printed = useRef(false);

  const match = findModel(familyId, modelSlug);

  // Opened from the "Datasheet (PDF)" button: print once the photo is ready
  useEffect(() => {
    if (!match || searchParams.get('print') !== '1' || printed.current) return undefined;

    const image = document.querySelector('.dsPhoto img');
    const go = () => {
      if (printed.current) return;
      printed.current = true;
      window.print();
    };

    const timer = setTimeout(go, 1500);
    if (image && !image.complete) image.addEventListener('load', () => setTimeout(go, 150), { once: true });
    else setTimeout(go, 300);

    return () => clearTimeout(timer);
  }, [match, searchParams]);

  if (!match) return <NotFound />;

  const { family, row } = match;
  const product = quoteFor(family, row);
  const title = familyText(family, 'title', lang, t);
  const text = familyText(family, 'text', lang, t);
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
  const features = t('waterTanks.features', { returnObjects: true });
  const showFeatures = Boolean(family.waterTank) && Array.isArray(features);
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

      <article className="dsSheet" aria-label={`${row.code} – ${d('title')}`}>
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

        <section className="dsBody">
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

          {(uses.length > 0 || showFeatures) && (
            <div className="dsSide">
              {uses.length > 0 && (
                <div>
                  <h2>{t('productModel.usesTitle')}</h2>
                  <ul className="dsTags">
                    {uses.map((use) => <li key={use}>{t(`waterTanks.uses.${use}`)}</li>)}
                  </ul>
                </div>
              )}

              {showFeatures && (
                <div>
                  <h2>{t('productModel.standardTitle')}</h2>
                  <ul className="dsChecks">
                    {features.map((feature) => (
                      <li key={feature}><Check aria-hidden="true" />{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

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
