import { Link, useParams } from 'react-router-dom';
import products from '../../data/products';

export default function ProductDetail() {
  const { slug } = useParams();

  const product = products.find(
    (item) => item.slug === slug
  );

  if (!product) {
    return (
      <main className="productDetailPage">
        <section className="productNotFound">
          <div className="container">
            <span className="eyebrow">
              PRODUCT NOT FOUND
            </span>

            <h1>
              Product
              <span>not available.</span>
            </h1>

            <Link to="/products">
              Back to Products ↗
            </Link>
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
    .slice(0, 3);

  return (
    <main className="productDetailPage">

      <section className="productDetailHero">

        <div className="container">

          <div className="productDetailMeta">
            <span>
              PRODUCT / {product.categoryLabel}
            </span>

            <span>
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
                  Technical Data
                  <span>↓</span>
                </a>

                <Link
                  to="/contact"
                  className="button ghost"
                >
                  Request a Quote
                  <span>↗</span>
                </Link>

              </div>

            </div>

            <div className="productDetailVisual">

              <div className="productDetailVisualTop">
                <span>PRODUCT SERIES</span>
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
                  <span>Material</span>
                  <strong>
                    {product.material}
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
                01 / TECHNICAL DATA
              </span>

              <p className="eyebrow">
                PRODUCT SPECIFICATION
              </p>
            </div>

            <h2>
              Technical
              <span>overview.</span>
            </h2>

          </div>

          <div className="technicalDataGrid">

            <div className="technicalDataIntro">

              <span className="technicalLabel">
                PRODUCT INFORMATION
              </span>

              <p>
                Core technical information for
                the selected RMA polyethylene
                product.
              </p>

            </div>

            <div className="technicalTable">

              <div>
                <span>Product</span>
                <strong>
                  {product.name}
                </strong>
              </div>

              <div>
                <span>Category</span>
                <strong>
                  {product.categoryLabel}
                </strong>
              </div>

              <div>
                <span>Capacity</span>
                <strong>
                  {product.capacity}
                </strong>
              </div>

              <div>
                <span>Material</span>
                <strong>
                  {product.material}
                </strong>
              </div>

              <div>
                <span>Application</span>
                <strong>
                  {product.application}
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

        </div>

      </section>


      <section className="productApplicationsSection dark">

        <div className="container">

          <div className="productApplicationsHeader">

            <div>
              <span className="sectionIndex light">
                02 / APPLICATION
              </span>

              <p className="eyebrow">
                BUILT FOR USE
              </p>
            </div>

            <div>
              <h2>
                Designed around
                <span>real applications.</span>
              </h2>

              <p>
                Product selection, geometry and
                technical requirements should
                always be evaluated according to
                actual operating conditions.
              </p>
            </div>

          </div>

          <div className="productApplicationsGrid">

            <article>
              <span>01</span>

              <h3>
                Industrial
                Storage
              </h3>

              <p>
                Suitable for industrial environments
                where reliable polyethylene storage
                is required.
              </p>
            </article>

            <article>
              <span>02</span>

              <h3>
                Process
                Applications
              </h3>

              <p>
                Supports application-specific
                process requirements depending on
                selected product configuration.
              </p>
            </article>

            <article>
              <span>03</span>

              <h3>
                Custom
                Requirements
              </h3>

              <p>
                RMA engineering support can be
                considered where standard catalogue
                configurations are not sufficient.
              </p>
            </article>

          </div>

        </div>

      </section>


      <section className="productDownloadsSection">

        <div className="container">

          <div className="productDownloadsHeader">

            <div>
              <span className="sectionIndex">
                03 / RESOURCES
              </span>

              <p className="eyebrow">
                DOCUMENTATION
              </p>
            </div>

            <h2>
              Product
              <span>resources.</span>
            </h2>

          </div>

          <div className="productDownloadsList">

            <div>
              <div>
                <span>PDF</span>

                <strong>
                  Technical Datasheet
                </strong>
              </div>

              <button type="button">
                Coming Soon
              </button>
            </div>

            <div>
              <div>
                <span>PDF</span>

                <strong>
                  Product Catalogue
                </strong>
              </div>

              <button type="button">
                Coming Soon
              </button>
            </div>

            <div>
              <div>
                <span>DOC</span>

                <strong>
                  Certificates
                </strong>
              </div>

              <button type="button">
                Coming Soon
              </button>
            </div>

          </div>

        </div>

      </section>


      <section className="relatedProductsSection">

        <div className="container">

          <div className="relatedProductsHeader">

            <div>
              <span className="sectionIndex">
                04 / RELATED
              </span>

              <p className="eyebrow">
                MORE PRODUCTS
              </p>
            </div>

            <Link to="/products">
              View All Products
              <span>↗</span>
            </Link>

          </div>

          <div className="relatedProductsGrid">

            {relatedProducts.map(
              (item, index) => (
                <Link
                  to={`/products/${item.slug}`}
                  className="relatedProductCard"
                  key={item.id}
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

                    <span>
                      ↗
                    </span>

                  </div>

                </Link>
              )
            )}

          </div>

        </div>

      </section>


      <section className="productDetailCta">

        <div className="container">

          <div>

            <span className="eyebrow">
              NEED MORE INFORMATION?
            </span>

            <h2>
              Let&apos;s discuss
              <span>your requirement.</span>
            </h2>

          </div>

          <Link
            to="/contact"
            className="productDetailCtaButton"
          >
            <span>
              Request a Quote
            </span>

            <span>
              ↗
            </span>
          </Link>

        </div>

      </section>

    </main>
  );
}