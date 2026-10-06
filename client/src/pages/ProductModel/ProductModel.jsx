import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Package } from 'lucide-react';

import Seo from '../../seo/Seo';
import { OG_IMAGE, SITE_URL, absoluteUrl } from '../../seo/site';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import AddToCartButton from '../../components/quote/AddToCartButton';
import CompareButton from '../../components/compare/CompareButton';
import { EcoBadge } from '../../components/ui/EcoMarks';
import useLanguage from '../../hooks/useLanguage';
import useModelQuote from '../../hooks/useModelQuote';
import formatNumber from '../../utils/formatNumber';
import { familyText, findModel, modelPath, similarModels } from '../../data/productTables';

/*
  One catalogue model, e.g. /tr/product-tables/vertical-tanks/rd-5000:
  photo, dimensions, uses, quote / quote cart, similar models of the family.
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
        <section className="internalHero modelNotFound">
          <div className="container">
            <p className="eyebrow">{t('productModel.eyebrow')}</p>
            <h1>{t('productModel.notFoundTitle')}</h1>
            <p>{t('productModel.notFoundText')}</p>
            <LocalizedLink to="/product-tables" className="button primary">
              <span>{t('productModel.backToTables')}</span>
              <Arrow className="buttonArrow" />
            </LocalizedLink>
          </div>
        </section>
      </main>
    );
  }

  const { family, row } = match;
  const product = quoteFor(family, row);
  const title = familyText(family, 'title', lang, t);
  const text = familyText(family, 'text', lang, t);
  const image = row.image || family.image;
  const num = (value) => formatNumber(value, lang);

  const specs = [
    ...(typeof row.volume === 'number' ? [{ key: 'volume', label: t('productTables.columns.volume'), value: num(row.volume) }] : []),
    ...product.specs.map((spec) => ({ key: spec.label, label: spec.label, value: spec.value })),
  ];

  const description = t('productModel.description', {
    code: row.code,
    family: title,
    specs: specs.slice(0, 4).map((spec) => `${spec.label}: ${spec.value}`).join(', '),
  });

  const similar = similarModels(family, row);
  const features = t('waterTanks.features', { returnObjects: true });
  const path = modelPath(family, row);

  return (
    <main className="internalPage modelPage">
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

      <section className="modelHero">
        <div className="container">
          <nav className="modelCrumbs" aria-label="breadcrumb">
            <LocalizedLink to="/products">{t('meta.titles.products')}</LocalizedLink>
            <span aria-hidden="true">/</span>
            <LocalizedLink to="/product-tables">{t('meta.titles.productTables')}</LocalizedLink>
            <span aria-hidden="true">/</span>
            <LocalizedLink to={`/product-tables#${family.id}`}>{title}</LocalizedLink>
          </nav>

          <div className="modelHeroGrid">
            <div className="modelMedia">
              {image ? <img src={image} alt={`${row.code} – ${title}`} /> : <Package aria-hidden="true" />}
            </div>

            <div className="modelInfo">
              <p className="eyebrow">{title}</p>

              <h1>
                {row.code}
                {product.capacity && <span>{product.capacity}</span>}
              </h1>

              {text && <p className="modelText">{text}</p>}

              {family.waterTank?.uses?.length > 0 && (
                <div className="modelUses">
                  <span className="cmLabel">{t('productModel.usesTitle')}</span>
                  <ul>
                    {family.waterTank.uses.map((use) => (
                      <li key={use}>{t(`waterTanks.uses.${use}`)}</li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="modelSpecs">
                {specs.map((spec) => (
                  <div key={spec.key}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="modelEco">
                <EcoBadge type="recycle" />
                {['tanks', 'chemical', 'food'].includes(family.group) && <EcoBadge type="longLife" />}
                <EcoBadge type="solar" />
              </div>

              <div className="modelActions">
                <button type="button" className="button primary" onClick={() => openQuote(product)}>
                  <span>{t('productModel.quote')}</span>
                  <Arrow className="buttonArrow" />
                </button>
                <AddToCartButton product={product} />
                <CompareButton family={family} row={row} />
              </div>

              <p className="modelSource">{t('productModel.source')}</p>
            </div>
          </div>
        </div>
      </section>

      {family.group === 'tanks' && Array.isArray(features) && (
        <section className="modelBlock">
          <div className="container">
            <h2 className="modelBlockTitle">{t('productModel.standardTitle')}</h2>
            <ul className="modelFeatures">
              {features.map((feature) => (
                <li key={feature}>
                  <Check aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="modelBlock">
          <div className="container">
            <div className="modelBlockHead">
              <h2 className="modelBlockTitle">{t('productModel.similar')}</h2>
              <LocalizedLink to={`/product-tables#${family.id}`} className="wtTextLink">
                {t('productModel.allModels')}
                <Arrow />
              </LocalizedLink>
            </div>

            <ul className="modelSimilar">
              {similar.map((item) => (
                <li key={item.slug}>
                  <LocalizedLink to={modelPath(family, item)} className="modelSimilarCard">
                    <span className="modelSimilarImage">
                      {item.image || family.image ? <img src={item.image || family.image} alt="" loading="lazy" /> : <Package aria-hidden="true" />}
                    </span>
                    <strong>{item.code}</strong>
                    {typeof item.volume === 'number' && <em>{num(item.volume)} L</em>}
                    {typeof item.height === 'number' && (
                      <small>
                        {t('productTables.columns.height')}: {num(item.height)}
                      </small>
                    )}
                  </LocalizedLink>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="modelBlock modelCustom">
        <div className="container">
          <LocalizedLink to="/custom-molding" className="modelCustomLink">
            <span>{t('productModel.customSize')}</span>
            <Arrow />
          </LocalizedLink>
        </div>
      </section>
    </main>
  );
}
