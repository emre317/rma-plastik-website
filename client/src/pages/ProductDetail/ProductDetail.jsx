import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import useProducts from '../../hooks/useProducts';
import usePageTitle from '../../hooks/usePageTitle';
import { useQuote } from '../../components/quote/QuoteContext';

const technicalFields = [
  'name',
  'categoryLabel',
  'capacity',
  'material',
  'application',
  'technology',
];

const technicalFieldLabels = {
  name: 'product',
  categoryLabel: 'category',
  capacity: 'capacity',
  material: 'material',
  application: 'application',
  technology: 'technology',
};

export default function ProductDetail() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const products = useProducts();
  const { openQuote } = useQuote();

  const product = products.find(
    (item) => item.slug === slug
  );

  usePageTitle(
    product ? product.name : t('meta.titles.productNotFound')
  );

  if (!product) {
    return (
      <main className="productDetailPage">
        <section className="productNotFound">
          <div className="container">
            <span className="eyebrow">
              {t('productDetail.notFoundEyebrow')}
            </span>

            <h1>
              {t('productDetail.notFoundTitle')}
              <span>{t('productDetail.notFoundTitleAccent')}</span>
            </h1>

            <LocalizedLink to="/products">
              {t('productDetail.backToProducts')} <Arrow />
            </LocalizedLink>
          </div>
        </section>
      </main>
    );
  }

  const relatedProducts = products
    .filter(
      (item) =>
        item.slug !== product.slug
    )
    .sort(
      (a, b) =>
        Number(b.category === product.category) -
        Number(a.category === product.category)
    )
    .slice(0, 3);

  const requestQuote = () => openQuote(product.quoteName);

  const applications = t('productDetail.applications.items', {
    returnObjects: true,
  });

  const resources = t('productDetail.resources.items', {
    returnObjects: true,
  });

  return (
    <main className="productDetailPage">

      <section className="productDetailHero">

        <div className="container">

          <div className="productDetailMeta">
            <span>
              {t('productDetail.metaProduct')} / {product.categoryLabel}
            </span>

            <span dir="ltr">
              RMA / {product.slug}
            </span>
          </div>

          <div className="productDetailHeroGrid">

            <div className="productDetailHeroContent">

              <span className="eyebrow">
                {product.categoryLabel}
              </span>

              <h1>
                {product.name}
              </h1>

              <p>
                {product.description}
              </p>

              <div className="productDetailHeroActions">

                <a
                  href="#technical-data"
                  className="button primary"
                >
                  {t('productDetail.technicalData')}
                  <Arrow direction="down" />
                </a>

                <button
                  type="button"
                  className="button ghost"
                  onClick={requestQuote}
                >
                  {t('common.requestQuote')}
                  <Arrow />
                </button>

              </div>

            </div>

            <div className="productDetailVisual">

              <div className="productDetailVisualTop">
                <span>{t('productDetail.series')}</span>
                <span>{product.capacity}</span>
              </div>

              <div className="productDetailTank">

                <div className="productDetailTankCap" />

                <div className="productDetailTankBody">
                  <span />
                  <span />
                  <span />
                </div>

              </div>

              <div className="productDetailVisualBottom">

                <div>
                  <span>{t('productDetail.fields.material')}</span>
                  <strong>
                    {product.material}
                  </strong>
                </div>

                <div>
                  <span>{t('productDetail.fields.technology')}</span>
                  <strong>
                    {product.technology}
                  </strong>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>


      <section
        className="technicalDataSection"
        id="technical-data"
      >

        <div className="container">

          <div className="technicalDataHeader">

            <div>
              <span className="sectionIndex">
                {t('productDetail.technical.index')}
              </span>

              <p className="eyebrow">
                {t('productDetail.technical.eyebrow')}
              </p>
            </div>

            <h2>
              {t('productDetail.technical.title')}
              <span>{t('productDetail.technical.titleAccent')}</span>
            </h2>

          </div>

          <div className="technicalDataGrid">

            <div className="technicalDataIntro">

              <span className="technicalLabel">
                {t('productDetail.technical.label')}
              </span>

              <p>
                {t('productDetail.technical.text')}
              </p>

            </div>

            <div className="technicalTable">

              {technicalFields.map((field) => (
                <div key={field}>
                  <span>
                    {t(`productDetail.fields.${technicalFieldLabels[field]}`)}
                  </span>
                  <strong>
                    {product[field]}
                  </strong>
                </div>
              ))}

            </div>

          </div>

        </div>

      </section>


      <section className="productApplicationsSection dark">

        <div className="container">

          <div className="productApplicationsHeader">

            <div>
              <span className="sectionIndex light">
                {t('productDetail.applications.index')}
              </span>

              <p className="eyebrow">
                {t('productDetail.applications.eyebrow')}
              </p>
            </div>

            <div>
              <h2>
                {t('productDetail.applications.title')}
                <span>{t('productDetail.applications.titleAccent')}</span>
              </h2>

              <p>
                {t('productDetail.applications.text')}
              </p>
            </div>

          </div>

          <div className="productApplicationsGrid">

            {applications.map((item, index) => (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>

                <h3>
                  {item.title}
                </h3>

                <p>
                  {item.description}
                </p>
              </article>
            ))}

          </div>

        </div>

      </section>


      <section className="productDownloadsSection">

        <div className="container">

          <div className="productDownloadsHeader">

            <div>
              <span className="sectionIndex">
                {t('productDetail.resources.index')}
              </span>

              <p className="eyebrow">
                {t('productDetail.resources.eyebrow')}
              </p>
            </div>

            <h2>
              {t('productDetail.resources.title')}
              <span>{t('productDetail.resources.titleAccent')}</span>
            </h2>

          </div>

          <div className="productDownloadsList">

            {resources.map((resource) => (
              <div key={resource.title}>
                <div>
                  <span>{resource.type}</span>

                  <strong>
                    {resource.title}
                  </strong>
                </div>

                <button type="button" disabled>
                  {t('productDetail.resources.comingSoon')}
                </button>
              </div>
            ))}

          </div>

        </div>

      </section>


      <section className="relatedProductsSection">

        <div className="container">

          <div className="relatedProductsHeader">

            <div>
              <span className="sectionIndex">
                {t('productDetail.related.index')}
              </span>

              <p className="eyebrow">
                {t('productDetail.related.eyebrow')}
              </p>
            </div>

            <LocalizedLink to="/products">
              {t('productDetail.related.viewAll')}
              <Arrow />
            </LocalizedLink>

          </div>

          <div className="relatedProductsGrid">

            {relatedProducts.map(
              (item, index) => (
                <LocalizedLink
                  to={`/products/${item.slug}`}
                  className="relatedProductCard"
                  key={item.slug}
                >

                  <div className="relatedProductTop">
                    <span>
                      {String(index + 1).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <span>
                      {item.categoryLabel}
                    </span>
                  </div>

                  <div className="relatedProductObject">

                    <div className="relatedProductCap" />

                    <div className="relatedProductBody">
                      <span />
                      <span />
                    </div>

                  </div>

                  <div className="relatedProductBottom">

                    <h3>
                      {item.name}
                    </h3>

                    <Arrow />

                  </div>

                </LocalizedLink>
              )
            )}

          </div>

        </div>

      </section>


      <section className="productDetailCta">

        <div className="container">

          <div>

            <span className="eyebrow">
              {t('productDetail.cta.eyebrow')}
            </span>

            <h2>
              {t('productDetail.cta.title')}
              <span>{t('productDetail.cta.titleAccent')}</span>
            </h2>

          </div>

          <button
            type="button"
            className="productDetailCtaButton"
            onClick={requestQuote}
          >
            <span>
              {t('common.requestQuote')}
            </span>

            <Arrow />
          </button>

        </div>

      </section>

    </main>
  );
}
