import { useState } from 'react';
import { Link } from 'react-router-dom';

const productCategories = [
  {
    id: 'industrial',
    catalogCategory: 'industrial-tanks',
    number: '01',
    label: 'Industrial Tanks',
    title: 'Industrial Storage Tanks',
    capacity: '500 — 42,000 L',
    application: 'Industrial / Process / Storage',
    description:
      'High-capacity polyethylene storage solutions developed for demanding industrial environments and long-term operation.',
  },
  {
    id: 'chemical',
    catalogCategory: 'chemical-tanks',
    number: '02',
    label: 'Chemical Tanks',
    title: 'Chemical Storage Solutions',
    capacity: '500 — 30,000 L',
    application: 'Chemical / Process',
    description:
      'Polyethylene tanks engineered for chemical storage applications where durability, compatibility and operational reliability are critical.',
  },
  {
    id: 'water',
    catalogCategory: 'water-tanks',
    number: '03',
    label: 'Water Tanks',
    title: 'Water Storage Tanks',
    capacity: '100 — 20,000 L',
    application: 'Water / Infrastructure',
    description:
      'Reliable polyethylene water storage solutions designed for residential, commercial, agricultural and industrial use.',
  },
  {
    id: 'agriculture',
    catalogCategory: 'agriculture',
    number: '04',
    label: 'Agricultural',
    title: 'Agricultural Solutions',
    capacity: 'Application Based',
    application: 'Agriculture / Farming',
    description:
      'Durable polyethylene products developed for agricultural operations, liquid storage and field applications.',
  },
  {
    id: 'material',
    catalogCategory: null,
    number: '05',
    label: 'Material Handling',
    title: 'Material Handling Products',
    capacity: 'Multiple Formats',
    application: 'Logistics / Industry',
    description:
      'Industrial handling products designed for repeated use across logistics, production and warehouse operations.',
  },
  {
    id: 'custom',
    catalogCategory: 'custom',
    number: '06',
    label: 'Custom Products',
    title: 'Custom Engineered Products',
    capacity: 'Project Based',
    application: 'OEM / Custom',
    description:
      'Application-specific polyethylene products developed according to project requirements, geometry and operational needs.',
  },
];

export default function ProductExplorerSection() {
  const [activeProduct, setActiveProduct] = useState(productCategories[0]);

  return (
    <section className="productExplorerSection" id="products">
      <div className="container">

        <div className="productExplorerHeader">

          <div>
            <span className="sectionIndex">
              04 / PRODUCTS
            </span>

            <p className="eyebrow">
              PRODUCT PORTFOLIO
            </p>
          </div>

          <div>
            <h2>
              Solutions for
              <span>every application.</span>
            </h2>

            <p className="productIntroText">
              Explore RMA's polyethylene product portfolio across industrial,
              chemical, agricultural and application-specific requirements.
            </p>
          </div>

        </div>

        <div className="productExplorer">

          <div className="productCategoryList">

            {productCategories.map((item) => {
              const active = activeProduct.id === item.id;

              return (
                <button
                  key={item.id}
                  className={`productCategoryItem ${active ? 'active' : ''}`}
                  onClick={() => setActiveProduct(item)}
                  aria-pressed={active}
                  type="button"
                >
                  <span className="productCategoryNumber">
                    {item.number}
                  </span>

                  <span className="productCategoryLabel">
                    {item.label}
                  </span>

                  <span className="productCategoryArrow">
                    ↗
                  </span>
                </button>
              );
            })}

          </div>

          <div className="productPreview">

            <div className="productPreviewTop">
              <span>
                {activeProduct.application}
              </span>

              <span>
                RMA / PRODUCT SYSTEM
              </span>
            </div>

            <div className="productObject">

              <div className="productObjectCap" />

              <div className="productObjectBody">
                <span />
                <span />
                <span />
              </div>

            </div>

            <div className="productPreviewContent">

              <div>
                <span className="productPreviewLabel">
                  SELECTED CATEGORY
                </span>

                <h3>
                  {activeProduct.title}
                </h3>
              </div>

              <div className="productPreviewMeta">

                <div>
                  <span>Capacity</span>
                  <strong>
                    {activeProduct.capacity}
                  </strong>
                </div>

                <div>
                  <span>Application</span>
                  <strong>
                    {activeProduct.application}
                  </strong>
                </div>

              </div>

              <p>
                {activeProduct.description}
              </p>

              <Link
                to={
                  activeProduct.catalogCategory
                    ? `/products?category=${activeProduct.catalogCategory}`
                    : '/contact'
                }
                className="productExploreLink"
              >
                {activeProduct.catalogCategory
                  ? 'Explore Product Range'
                  : 'Ask About This Range'}
                <span>↗</span>
              </Link>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}