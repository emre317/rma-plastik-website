import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';

// Text lives in the locale files under productExplorer.items.<id>
const productCategories = [
  { id: 'industrial', catalogCategory: 'industrial-tanks' },
  { id: 'chemical', catalogCategory: 'chemical-tanks' },
  { id: 'water', catalogCategory: 'water-tanks' },
  { id: 'agriculture', catalogCategory: 'agriculture' },
  { id: 'material', catalogCategory: null },
  { id: 'custom', catalogCategory: 'custom' },
];

export default function ProductExplorerSection() {
  const { t } = useTranslation();

  const [activeId, setActiveId] = useState(productCategories[0].id);

  const activeCategory = productCategories.find(
    (item) => item.id === activeId
  );

  const active = (field) =>
    t(`productExplorer.items.${activeId}.${field}`);

  return (
    <section className="productExplorerSection" id="products">
      <div className="container">

        <div className="productExplorerHeader">

          <div>
            <span className="sectionIndex">
              {t('productExplorer.index')}
            </span>

            <p className="eyebrow">
              {t('productExplorer.eyebrow')}
            </p>
          </div>

          <div>
            <h2>
              {t('productExplorer.title')}
              <span>{t('productExplorer.titleAccent')}</span>
            </h2>

            <p className="productIntroText">
              {t('productExplorer.intro')}
            </p>
          </div>

        </div>

        <div className="productExplorer">

          <div className="productCategoryList">

            {productCategories.map((item, index) => {
              const isActive = activeId === item.id;

              return (
                <button
                  key={item.id}
                  className={`productCategoryItem ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveId(item.id)}
                  aria-pressed={isActive}
                  type="button"
                >
                  <span className="productCategoryNumber">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="productCategoryLabel">
                    {t(`productExplorer.items.${item.id}.label`)}
                  </span>

                  <Arrow className="productCategoryArrow" />
                </button>
              );
            })}

          </div>

          <div className="productPreview">

            <div className="productPreviewTop">
              <span>
                {active('application')}
              </span>

              <span>
                {t('productExplorer.previewTop')}
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
                  {t('productExplorer.selected')}
                </span>

                <h3>
                  {active('title')}
                </h3>
              </div>

              <div className="productPreviewMeta">

                <div>
                  <span>{t('productExplorer.capacity')}</span>
                  <strong>
                    {active('capacity')}
                  </strong>
                </div>

                <div>
                  <span>{t('productExplorer.application')}</span>
                  <strong>
                    {active('application')}
                  </strong>
                </div>

              </div>

              <p>
                {active('description')}
              </p>

              <LocalizedLink
                to={
                  activeCategory.catalogCategory
                    ? `/products?category=${activeCategory.catalogCategory}`
                    : '/contact'
                }
                className="productExploreLink"
              >
                {activeCategory.catalogCategory
                  ? t('productExplorer.exploreRange')
                  : t('productExplorer.askRange')}
                <Arrow />
              </LocalizedLink>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
