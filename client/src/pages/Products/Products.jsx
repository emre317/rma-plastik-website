import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import useProducts from '../../hooks/useProducts';
import Seo from '../../seo/Seo';

const filterIds = [
  'all',
  'industrial-tanks',
  'chemical-tanks',
  'water-tanks',
  'agriculture',
  'custom',
];

export default function Products() {
  const { t } = useTranslation();
  const products = useProducts();

  const [searchParams, setSearchParams] = useSearchParams();

  const requestedFilter = searchParams.get('category');

  const activeFilter = filterIds.includes(requestedFilter)
    ? requestedFilter
    : 'all';

  function setActiveFilter(filterId) {
    setSearchParams(
      filterId === 'all' ? {} : { category: filterId },
      { replace: true }
    );
  }

  const filteredProducts =
    activeFilter === 'all'
      ? products
      : products.filter(
          (product) =>
            product.category === activeFilter
        );

  const meta = t('productsPage.meta', { returnObjects: true });

  return (
    <main className="productsPage">
      <Seo title={t('meta.titles.products')} description={t('meta.descriptions.products')} breadcrumbs={[{ name: t('meta.titles.products'), path: '/products' }]} />

      <section className="internalHero">
        <div className="container">

          <div className="internalHeroMeta">
            <span>{meta[0]}</span>
            <span>{meta[1]}</span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              {t('productsPage.eyebrow')}
            </p>

            <h1>
              {t('productsPage.title')}
              <span>{t('productsPage.titleAccent')}</span>
            </h1>

          </div>

          <div className="internalHeroBottom">

            <p>
              {t('productsPage.text')}
            </p>

            <span>
              {t('productsPage.tag')}
            </span>

          </div>

        </div>
      </section>

      <section className="productsCatalog">
        <div className="container">

          <div className="productsCatalogTop">

            <div>
              <span className="sectionIndex">
                {t('productsPage.catalogIndex')}
              </span>

              <h2>
                {t('productsPage.catalogTitle')}
                <span>{t('productsPage.catalogTitleAccent')}</span>
              </h2>
            </div>

            <p>
              {t('productsPage.catalogText')}
            </p>

          </div>

          <div className="productFilters">

            {filterIds.map((filterId) => (
              <button
                type="button"
                key={filterId}
                className={
                  activeFilter === filterId
                    ? 'active'
                    : ''
                }
                aria-pressed={activeFilter === filterId}
                onClick={() =>
                  setActiveFilter(filterId)
                }
              >
                {t(`productsPage.filters.${filterId}`)}
              </button>
            ))}

          </div>

          {filteredProducts.length === 0 && (
            <div className="productsEmpty">
              <p>
                {t('productsPage.empty')}
              </p>

              <LocalizedLink to="/contact">
                {t('productsPage.askTeam')}
                <Arrow />
              </LocalizedLink>
            </div>
          )}

          <div className="productsCatalogGrid">

            {filteredProducts.map(
              (product, index) => (
                <LocalizedLink
                  to={`/products/${product.slug}`}
                  className="productCatalogCard"
                  key={product.slug}
                >

                  <div className="productCatalogMedia">

                    <span className="productCatalogNumber">
                      {String(index + 1).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <span className="productCatalogCategory">
                      {product.categoryLabel}
                    </span>

                    {product.image ? (
                      <img
                        className="productPhoto"
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="catalogTank">

                        <div className="catalogTankCap" />

                        <div className="catalogTankBody">
                          <span />
                          <span />
                          <span />
                        </div>

                      </div>
                    )}

                    <Arrow className="productCatalogArrow" />

                  </div>

                  <div className="productCatalogContent">

                    <h3>
                      {product.name}
                    </h3>

                    <div className="productCatalogMeta">

                      <div>
                        <span>{t('productsPage.capacity')}</span>

                        <strong>
                          {product.capacity}
                        </strong>
                      </div>

                      <div>
                        <span>{t('productsPage.technology')}</span>

                        <strong>
                          {product.technology}
                        </strong>
                      </div>

                    </div>

                  </div>

                </LocalizedLink>
              )
            )}

          </div>

        </div>
      </section>

    </main>
  );
}
