import { Link, useSearchParams } from 'react-router-dom';

import products from '../../data/products';
import usePageTitle from '../../hooks/usePageTitle';

const filters = [
  {
    id: 'all',
    label: 'All Products',
  },
  {
    id: 'industrial-tanks',
    label: 'Industrial Tanks',
  },
  {
    id: 'chemical-tanks',
    label: 'Chemical Tanks',
  },
  {
    id: 'water-tanks',
    label: 'Water Tanks',
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
  },
  {
    id: 'custom',
    label: 'Custom',
  },
];

export default function Products() {
  usePageTitle('Products');

  const [searchParams, setSearchParams] = useSearchParams();

  const requestedFilter = searchParams.get('category');

  const activeFilter = filters.some(
    (filter) => filter.id === requestedFilter
  )
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

  return (
    <main className="productsPage">

      <section className="internalHero">
        <div className="container">

          <div className="internalHeroMeta">
            <span>
              02 / PRODUCTS
            </span>

            <span>
              PRODUCT PORTFOLIO
            </span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              POLYETHYLENE SOLUTIONS
            </p>

            <h1>
              Products built
              <span>for industry.</span>
            </h1>

          </div>

          <div className="internalHeroBottom">

            <p>
              Explore RMA polyethylene products developed
              for industrial, chemical, agricultural and
              application-specific requirements.
            </p>

            <span>
              RMA / PRODUCTS
            </span>

          </div>

        </div>
      </section>

      <section className="productsCatalog">
        <div className="container">

          <div className="productsCatalogTop">

            <div>
              <span className="sectionIndex">
                PRODUCT INDEX
              </span>

              <h2>
                Explore the
                <span>portfolio.</span>
              </h2>
            </div>

            <p>
              Filter products by application and product
              family.
            </p>

          </div>

          <div className="productFilters">

            {filters.map((filter) => (
              <button
                type="button"
                key={filter.id}
                className={
                  activeFilter === filter.id
                    ? 'active'
                    : ''
                }
                aria-pressed={activeFilter === filter.id}
                onClick={() =>
                  setActiveFilter(filter.id)
                }
              >
                {filter.label}
              </button>
            ))}

          </div>

          {filteredProducts.length === 0 && (
            <div className="productsEmpty">
              <p>
                No products listed in this category yet.
              </p>

              <Link to="/contact">
                Ask our team
                <span>↗</span>
              </Link>
            </div>
          )}

          <div className="productsCatalogGrid">

            {filteredProducts.map(
              (product, index) => (
                <Link
                  to={`/products/${product.slug}`}
                  className="productCatalogCard"
                  key={product.id}
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

                    <div className="catalogTank">

                      <div className="catalogTankCap" />

                      <div className="catalogTankBody">
                        <span />
                        <span />
                        <span />
                      </div>

                    </div>

                    <span className="productCatalogArrow">
                      ↗
                    </span>

                  </div>

                  <div className="productCatalogContent">

                    <h3>
                      {product.name}
                    </h3>

                    <div className="productCatalogMeta">

                      <div>
                        <span>Capacity</span>

                        <strong>
                          {product.capacity}
                        </strong>
                      </div>

                      <div>
                        <span>Technology</span>

                        <strong>
                          {product.technology}
                        </strong>
                      </div>

                    </div>

                  </div>

                </Link>
              )
            )}

          </div>

        </div>
      </section>

    </main>
  );
}