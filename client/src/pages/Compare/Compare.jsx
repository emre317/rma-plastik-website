import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GitCompareArrows, Package, X } from 'lucide-react';

import Seo from '../../seo/Seo';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import AddToCartButton from '../../components/quote/AddToCartButton';
import { MAX_COMPARE, resolveCompareKeys, useCompare } from '../../components/compare/CompareContext';
import useLanguage from '../../hooks/useLanguage';
import useModelQuote from '../../hooks/useModelQuote';
import formatNumber from '../../utils/formatNumber';
import { COLUMN_KEYS, familyText, modelPath } from '../../data/productTables';

/*
  Side-by-side comparison of 2–4 models. The models come from the address
  (/compare?models=vertical-tanks/rd-10000,vertical-tanks/rd-10002, shareable)
  or, without it, from the visitor's comparison list.
*/
export default function Compare() {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { keys, setCompare } = useCompare();
  const { openQuote, addToCart, inCart } = useQuote();
  const quoteFor = useModelQuote();

  const [onlyDifferences, setOnlyDifferences] = useState(false);

  const fromUrl = searchParams.get('models');
  const activeKeys = fromUrl ? fromUrl.split(',').filter(Boolean).slice(0, MAX_COMPARE) : keys;
  const items = resolveCompareKeys(activeKeys);

  // A shared link becomes the visitor's own comparison list
  useEffect(() => {
    if (fromUrl && items.length) setCompare(items.map((item) => item.key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl]);

  const remove = (key) => {
    const next = items.map((item) => item.key).filter((item) => item !== key);
    setCompare(next);
    setSearchParams(next.length ? { models: next.join(',') } : {}, { replace: true });
  };

  const num = (value) => formatNumber(value, lang);

  const rows = useMemo(() => {
    const columns = COLUMN_KEYS.filter((key) => items.some(({ family, row }) => family.columns.includes(key) && row[key] !== undefined));

    const list = [
      {
        key: 'family',
        label: t('compare.family'),
        values: items.map(({ family }) => familyText(family, 'title', lang, t)),
      },
      ...columns.map((key) => ({
        key,
        label: t(`productTables.columns.${key}`),
        values: items.map(({ row }) => (row[key] === undefined || row[key] === '' ? '–' : String(num(row[key])))),
        numeric: items.every(({ row }) => typeof row[key] === 'number'),
        raw: items.map(({ row }) => row[key]),
      })),
    ];

    if (items.some(({ family }) => family.waterTank)) {
      list.push({
        key: 'type',
        label: t('waterTanks.orientation'),
        values: items.map(({ family }) =>
          family.waterTank ? `${t(`waterTanks.${family.waterTank.orientation}`)} · ${t(`waterTanks.${family.waterTank.layer}`)}` : '–'
        ),
      });
      list.push({
        key: 'uses',
        label: t('waterTanks.use'),
        values: items.map(({ family }) => (family.waterTank?.uses || []).map((use) => t(`waterTanks.uses.${use}`)).join(', ') || '–'),
      });
    }

    return list.map((item) => ({ ...item, differs: new Set(item.values).size > 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((item) => item.key).join(','), lang]);

  // Smallest / largest numeric value of a row (volume, height…) get a marker
  const extreme = (row, index) => {
    if (!row.numeric || !row.differs) return '';
    const values = row.raw;
    if (values[index] === Math.max(...values)) return 'max';
    if (values[index] === Math.min(...values)) return 'min';
    return '';
  };

  const visibleRows = onlyDifferences ? rows.filter((row) => row.differs) : rows;
  const products = items.map(({ family, row }) => quoteFor(family, row));
  const allInCart = products.every((product) => inCart(product.name));

  return (
    <main className="internalPage comparePage">
      <Seo title={t('compare.title')} description={t('compare.description')} noindex />

      <section className="compareHero">
        <div className="container">
          <p className="eyebrow">
            <GitCompareArrows aria-hidden="true" />
            {t('compare.eyebrow')}
          </p>
          <h1>{t('compare.title')}</h1>
          <p>{t('compare.intro', { max: MAX_COMPARE })}</p>
        </div>
      </section>

      <section className="compareBody">
        <div className="container">
          {items.length < 2 ? (
            <div className="wtEmpty">
              <h3>{t('compare.emptyTitle')}</h3>
              <p>{t('compare.emptyText')}</p>
              <div>
                <LocalizedLink to="/water-tanks" className="button primary">
                  <span>{t('meta.titles.waterTanks')}</span>
                  <Arrow className="buttonArrow" />
                </LocalizedLink>
                <LocalizedLink to="/product-tables" className="wtTextLink">
                  {t('meta.titles.productTables')}
                  <Arrow />
                </LocalizedLink>
              </div>
            </div>
          ) : (
            <>
              <div className="compareToolbar">
                <label className="cmsCheck compareOnlyDiff">
                  <input type="checkbox" checked={onlyDifferences} onChange={(event) => setOnlyDifferences(event.target.checked)} />
                  <span>{t('compare.onlyDifferences')}</span>
                </label>

                <button
                  type="button"
                  className="addToCart"
                  disabled={allInCart}
                  onClick={() => products.forEach((product) => addToCart(product))}
                >
                  {allInCart ? t('compare.allInCart') : t('compare.addAll')}
                </button>
              </div>

              <div className="compareTableWrap">
                <table className="compareTable" style={{ '--cols': items.length }}>
                  <thead>
                    <tr>
                      <th scope="col"><span className="visuallyHidden">{t('compare.title')}</span></th>
                      {items.map(({ key, family, row }) => (
                        <th key={key} scope="col">
                          <div className="compareModel">
                            <button type="button" className="compareRemove" onClick={() => remove(key)} aria-label={`${row.code} – ${t('compare.remove')}`}>
                              <X aria-hidden="true" />
                            </button>
                            <LocalizedLink to={modelPath(family, row)} className="compareModelImage">
                              {row.image || family.image ? <img src={row.image || family.image} alt="" /> : <Package aria-hidden="true" />}
                            </LocalizedLink>
                            <LocalizedLink to={modelPath(family, row)} className="compareModelCode">{row.code}</LocalizedLink>
                            {typeof row.volume === 'number' && <strong>{num(row.volume)} L</strong>}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((item) => (
                      <tr key={item.key} className={item.differs ? 'differs' : ''}>
                        <th scope="row">{item.label}</th>
                        {item.values.map((value, index) => (
                          <td key={items[index].key} className={extreme(item, index)}>
                            {value}
                            {extreme(item, index) && <small>{t(`compare.${extreme(item, index)}`)}</small>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {onlyDifferences && visibleRows.length === 0 && (
                      <tr>
                        <td colSpan={items.length + 1} className="compareSame">{t('compare.noDifferences')}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row"><span className="visuallyHidden">{t('productModel.quote')}</span></th>
                      {items.map(({ key }, index) => (
                        <td key={key}>
                          <div className="compareActions">
                            <button type="button" className="button primary" onClick={() => openQuote(products[index])}>
                              <span>{t('productModel.quote')}</span>
                              <Arrow className="buttonArrow" />
                            </button>
                            <AddToCartButton product={products[index]} compact />
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
