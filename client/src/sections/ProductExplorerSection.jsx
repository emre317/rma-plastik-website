import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink } from '../components/i18n/LocalizedLink';
import Arrow from '../components/i18n/Arrow';
import Carousel3D from '../components/ui/Carousel3D';
import useProducts from '../hooks/useProducts';

// Text lives in the locale files under productExplorer.items.<id>
const productCategories = [
  { id: 'industrial', catalogCategory: 'industrial-tanks', hue: 214 },
  { id: 'chemical', catalogCategory: 'chemical-tanks', hue: 196 },
  { id: 'water', catalogCategory: 'water-tanks', hue: 204 },
  { id: 'agriculture', catalogCategory: 'agriculture', hue: 170 },
  { id: 'material', catalogCategory: null, hue: 226 },
  { id: 'custom', catalogCategory: 'custom', hue: 240 },
];

const linkFor = (category) =>
  category.catalogCategory ? `/products?category=${category.catalogCategory}` : '/contact';

export default function ProductExplorerSection() {
  const { t } = useTranslation();
  const products = useProducts();

  const [activeIndex, setActiveIndex] = useState(0);
  const onActiveChange = useCallback((index) => setActiveIndex(index), []);

  const text = (id, field) => t(`productExplorer.items.${id}.${field}`);

  // Uploaded product photo of the category (admin panel), if any
  const photoFor = (category) =>
    products.find((product) => product.category === category.catalogCategory && product.image)?.image;

  const active = productCategories[activeIndex];

  return (
    <section className="productExplorerSection portfolioSection" id="products">
      <div className="container">

        <div className="productExplorerHeader">
          <div>
            <span className="sectionIndex">{t('productExplorer.index')}</span>
            <p className="eyebrow">{t('productExplorer.eyebrow')}</p>
          </div>

          <div>
            <h2>
              {t('productExplorer.title')}
              <span>{t('productExplorer.titleAccent')}</span>
            </h2>

            <p className="productIntroText">{t('productExplorer.intro')}</p>
          </div>
        </div>

        <div className="portfolioGallery">
          <div className="portfolioGalleryTop">
            <span>{t('productExplorer.previewTop')}</span>
            <span className="portfolioHint">{t('productExplorer.rotateHint')}</span>
            <span className="portfolioCounter">
              {String(activeIndex + 1).padStart(2, '0')}
              <small> / {String(productCategories.length).padStart(2, '0')}</small>
            </span>
          </div>

          <Carousel3D
            items={productCategories}
            onActiveChange={onActiveChange}
            labels={{
              prev: t('productExplorer.prev'),
              next: t('productExplorer.next'),
              hint: t('productExplorer.rotateHint'),
              goTo: (n) => `${t('productExplorer.selected')} ${n}`,
            }}
            renderCard={(category, { active: isActive, index }) => {
              const photo = photoFor(category);

              return (
                <LocalizedLink
                  to={linkFor(category)}
                  className="portfolioCard"
                  style={{ '--hue': category.hue }}
                  tabIndex={isActive ? 0 : -1}
                  draggable={false}
                >
                  <span className="portfolioCardMedia" aria-hidden="true">
                    {photo ? (
                      <img src={photo} alt="" loading="lazy" decoding="async" draggable={false} />
                    ) : (
                      <span className="portfolioTank">
                        <span className="portfolioTankCap" />
                        <span className="portfolioTankBody"><span /><span /><span /></span>
                      </span>
                    )}
                  </span>

                  <span className="portfolioCardNumber">{String(index + 1).padStart(2, '0')}</span>

                  <span className="portfolioCardBody">
                    <strong>{text(category.id, 'label')}</strong>
                    <em>{text(category.id, 'capacity')}</em>
                    <small>{text(category.id, 'application')}</small>
                  </span>
                </LocalizedLink>
              );
            }}
          />
        </div>

        <div className="portfolioDetail" aria-live="polite">
          <div>
            <span className="productPreviewLabel">{t('productExplorer.selected')}</span>
            <h3>{text(active.id, 'title')}</h3>
            <p>{text(active.id, 'description')}</p>
          </div>

          <div className="portfolioDetailSide">
            <dl>
              <div>
                <dt>{t('productExplorer.capacity')}</dt>
                <dd>{text(active.id, 'capacity')}</dd>
              </div>
              <div>
                <dt>{t('productExplorer.application')}</dt>
                <dd>{text(active.id, 'application')}</dd>
              </div>
            </dl>

            <LocalizedLink to={linkFor(active)} className="button primary">
              <span>
                {active.catalogCategory ? t('productExplorer.exploreRange') : t('productExplorer.askRange')}
              </span>
              <Arrow className="buttonArrow" />
            </LocalizedLink>
          </div>
        </div>

      </div>
    </section>
  );
}
