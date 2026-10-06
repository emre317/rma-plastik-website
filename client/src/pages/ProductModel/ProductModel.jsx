import { Fragment } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronRight, FileDown, Layers, Package, Phone, Recycle, Ruler, Sun } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { CATALOG_PDF } from '../../components/ui/CatalogLink';
import { OG_IMAGE, SITE_URL, absoluteUrl } from '../../seo/site';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import AddToCartButton from '../../components/quote/AddToCartButton';
import CompareButton from '../../components/compare/CompareButton';
import company from '../../data/company';
import useLanguage from '../../hooks/useLanguage';
import useModelQuote from '../../hooks/useModelQuote';
import formatNumber from '../../utils/formatNumber';
import { familyText, findModel, modelPath, similarModels } from '../../data/productTables';

// Up to four headline values shown as large tiles, in this order of preference
const HIGHLIGHT_KEYS = ['volume', 'diameter', 'width', 'length', 'height', 'outlet', 'cap'];

/*
  One catalogue model, e.g. /tr/product-tables/vertical-tanks/rd-5000:
  photo, model switcher of the family, headline values, full technical table,
  uses and standard features, similar models and quote actions.
*/
export default function ProductModel() {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const { familyId, modelSlug } = useParams();
  const { openQuote } = useQuote();
  const quoteFor = useModelQuote();

  const match = findModel(familyId, modelSlug);

  if (!match) {
    return (
      <main className="internalPage">
        <Seo title={t('productModel.notFoundTitle')} description={t('productModel.notFoundText')} noindex />
        <PageHeader
          compact
          crumbs={[{ label: t('meta.titles.productTables'), to: '/product-tables' }, { label: t('productModel.notFoundTitle') }]}
          eyebrow={t('productModel.eyebrow')}
          title={t('productModel.notFoundTitle')}
          lead={t('productModel.notFoundText')}
          actions={(
            <LocalizedLink to="/product-tables" className="button primary">
              <span>{t('productModel.backToTables')}</span>
              <Arrow className="buttonArrow" />
            </LocalizedLink>
          )}
        />
      </main>
    );
  }

  const { family, row } = match;
  const product = quoteFor(family, row);
  const title = familyText(family, 'title', lang, t);
  const text = familyText(family, 'text', lang, t);
  const image = row.image || family.image;
  const num = (value) => formatNumber(value, lang);
  const col = (key) => t(`productTables.columns.${key}`);

  const columns = (family.columns || []).filter((key) => key !== 'code' && row[key] !== undefined && row[key] !== '');
  const specs = [
    ...(family.waterTank
      ? [{ key: 'type', label: t('waterTanks.orientation'), value: [t(`waterTanks.${family.waterTank.orientation}`), t(`waterTanks.${family.waterTank.layer}`)].join(' · ') }]
      : []),
    ...columns.map((key) => ({ key, label: col(key), value: num(row[key]) })),
  ];
  const highlights = HIGHLIGHT_KEYS.filter((key) => columns.includes(key)).slice(0, 4);

  const description = t('productModel.description', {
    code: row.code,
    family: title,
    specs: specs.slice(0, 4).map((spec) => `${spec.label}: ${spec.value}`).join(', '),
  });

  const similar = similarModels(family, row);
  const features = t('waterTanks.features', { returnObjects: true });
  const showFeatures = family.group === 'tanks' && Array.isArray(features);
  const uses = family.waterTank?.uses || [];
  const path = modelPath(family, row);

  // Size chips show the volume; the code is added where volumes repeat in the family
  const volumeCount = family.rows.reduce((counts, item) => ({ ...counts, [item.volume]: (counts[item.volume] || 0) + 1 }), {});

  const crumbs = [
    { label: t('nav.products'), to: '/products' },
    { label: t('meta.titles.productTables'), to: '/product-tables' },
    { label: title, to: `/product-tables#${family.id}` },
    { label: row.code },
  ];

  return (
    <main className="internalPage pmPage">
      <Seo
        title={`${row.code} – ${title}${product.capacity ? ` ${product.capacity}` : ''}`}
        description={description}
        type="product"
        image={image ? absoluteUrl(image) : undefined}
        breadcrumbs={[
          { name: t('meta.titles.products'), path: '/products' },
          { name: t('meta.titles.productTables'), path: '/product-tables' },
          { name: row.code, path },
        ]}
        jsonLd={[
          {
            '@type': 'Product',
            name: `${row.code} ${title}`,
            sku: row.code,
            description,
            category: title,
            image: image ? absoluteUrl(image) : OG_IMAGE,
            brand: { '@type': 'Brand', name: 'RMA Plastik' },
            manufacturer: { '@id': `${SITE_URL}/#organization` },
            additionalProperty: specs.map((spec) => ({ '@type': 'PropertyValue', name: spec.label, value: String(spec.value) })),
          },
        ]}
      />

      <section className="pmHero">
        <div className="container">
          <nav className="pmCrumbs" aria-label={t('nav.breadcrumb')}>
            <ol>
              <li><LocalizedLink to="/">{t('nav.home')}</LocalizedLink></li>
              {crumbs.map((crumb, index) => (
                <Fragment key={crumb.label}>
                  <li aria-hidden="true" className="pmCrumbSep"><ChevronRight /></li>
                  <li>
                    {crumb.to ? (
                      <LocalizedLink to={crumb.to}>{crumb.label}</LocalizedLink>
                    ) : (
                      <span aria-current={index === crumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>
                    )}
                  </li>
                </Fragment>
              ))}
            </ol>
          </nav>

          <div className="pmGrid">
            {/* Visual */}
            <div className="pmMediaCol">
              <figure className="pmMedia">
                {image ? <img src={image} alt={`${row.code} – ${title}`} /> : <Package aria-hidden="true" />}
                <figcaption>
                  <span className="pmMediaTag">{title}</span>
                  <span className="pmMediaCode">{row.code}</span>
                </figcaption>
              </figure>

              <ul className="pmTrust">
                {family.group !== 'textile' && (
                  <li><Layers aria-hidden="true" />{t('productModel.trust.monoblock')}</li>
                )}
                <li><Recycle aria-hidden="true" />{t('eco.recycle')}</li>
                <li className="eco"><Sun aria-hidden="true" />{t('eco.solar')}</li>
              </ul>
            </div>

            {/* Information */}
            <div className="pmInfo">
              <LocalizedLink to={`/product-tables#${family.id}`} className="pmFamily">{title}</LocalizedLink>

              <h1>
                {row.code}
                {product.capacity && <span>{product.capacity}</span>}
              </h1>

              {text && <p className="pmText">{text}</p>}

              {family.rows.length > 1 && (
                <div className="pmVariants">
                  <span className="pmLabel">{t('productModel.otherSizes', { count: family.rows.length })}</span>
                  <ul>
                    {family.rows.map((item) => (
                      <li key={item.slug}>
                        <LocalizedLink
                          to={modelPath(family, item)}
                          className={item.slug === row.slug ? 'active' : ''}
                          aria-current={item.slug === row.slug ? 'page' : undefined}
                        >
                          {typeof item.volume === 'number' ? `${num(item.volume)} L` : item.code}
                          {typeof item.volume === 'number' && volumeCount[item.volume] > 1 && <small>{item.code}</small>}
                        </LocalizedLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {highlights.length > 0 && (
                <dl className="pmHighlights">
                  {highlights.map((key) => (
                    <div key={key}>
                      <dt>{col(key)}</dt>
                      <dd>{num(row[key])}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="pmActions">
                <button type="button" className="button primary pmQuote" onClick={() => openQuote(product)}>
                  <span>{t('productModel.quote')}</span>
                  <Arrow className="buttonArrow" />
                </button>
                <AddToCartButton product={product} />
                <CompareButton family={family} row={row} />
              </div>

              <div className="pmHelp">
                <a href={company.phone.href} dir="ltr">
                  <Phone aria-hidden="true" />
                  <span>
                    <small>{t('productModel.callUs')}</small>
                    <strong>{company.phone.display}</strong>
                  </span>
                </a>
                <a href={CATALOG_PDF} download>
                  <FileDown aria-hidden="true" />
                  <span>
                    <small>{t('common.catalogMeta')}</small>
                    <strong>{t('common.catalog')}</strong>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical data */}
      <section className="pmDetails">
        <div className="container pmDetailsGrid">
          <div className="pmCard">
            <h2>
              <Ruler aria-hidden="true" />
              {t('productModel.specsTitle')}
            </h2>
            <table className="pmTable">
              <tbody>
                <tr>
                  <th scope="row">{t('productModel.codeLabel')}</th>
                  <td>{row.code}</td>
                </tr>
                <tr>
                  <th scope="row">{t('productModel.familyLabel')}</th>
                  <td>{title}</td>
                </tr>
                {specs.map((spec) => (
                  <tr key={spec.key}>
                    <th scope="row">{spec.label}</th>
                    <td>{spec.value}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">{t('productModel.materialLabel')}</th>
                  <td>{t('productModel.materialValue')}</td>
                </tr>
              </tbody>
            </table>
            <p className="pmSource">
              {t('productModel.source')}{' '}
              <a href={CATALOG_PDF} download className="sourceLink">{t('common.catalog')} (PDF)</a>
            </p>
          </div>

          <div className="pmSide">
            {uses.length > 0 && (
              <div className="pmCard">
                <h2>{t('productModel.usesTitle')}</h2>
                <ul className="pmUses">
                  {uses.map((use) => (
                    <li key={use}>{t(`waterTanks.uses.${use}`)}</li>
                  ))}
                </ul>
              </div>
            )}

            {showFeatures && (
              <div className="pmCard">
                <h2>{t('productModel.standardTitle')}</h2>
                <ul className="pmFeatures">
                  {features.map((feature) => (
                    <li key={feature}>
                      <Check aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pmCard pmCustom">
              <h2>{t('productModel.customTitle')}</h2>
              <p>{t('productModel.customSize')}</p>
              <LocalizedLink to="/custom-molding" className="pmCustomLink">
                {t('productExplorer.customLink')}
                <Arrow />
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      {similar.length > 0 && (
        <section className="pmSimilar">
          <div className="container">
            <div className="pmSimilarHead">
              <h2>{t('productModel.similar')}</h2>
              <LocalizedLink to={`/product-tables#${family.id}`} className="wtTextLink">
                {t('productModel.allModels')}
                <Arrow />
              </LocalizedLink>
            </div>

            <ul className="pmSimilarGrid">
              {similar.map((item) => {
                const itemImage = item.image || family.image;

                return (
                  <li key={item.slug} className="pmSimilarCard">
                    <LocalizedLink to={modelPath(family, item)} className="pmSimilarLink">
                      <span className="pmSimilarImage">
                        {itemImage ? <img src={itemImage} alt="" loading="lazy" /> : <Package aria-hidden="true" />}
                      </span>
                      <strong>{item.code}</strong>
                      <span className="pmSimilarMeta">
                        {[
                          typeof item.volume === 'number' ? `${num(item.volume)} L` : '',
                          typeof item.height === 'number' ? `${col('height')}: ${num(item.height)}` : '',
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </LocalizedLink>
                    <AddToCartButton product={quoteFor(family, item)} compact />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Phones: quote action stays at hand */}
      <div className="pmStickyBar">
        <span>
          <strong>{row.code}</strong>
          {product.capacity && <small>{product.capacity}</small>}
        </span>
        <button type="button" className="button primary" onClick={() => openQuote(product)}>
          <span>{t('productModel.quote')}</span>
          <Arrow className="buttonArrow" />
        </button>
      </div>
    </main>
  );
}
