import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import useLanguage from '../../hooks/useLanguage';
import formatNumber from '../../utils/formatNumber';
import families, { familyText, groups, modelPath } from '../../data/productTables';
import useModelQuote from '../../hooks/useModelQuote';
import AddToCartButton from '../../components/quote/AddToCartButton';
import CompareButton from '../../components/compare/CompareButton';
import { EcoBadge } from '../../components/ui/EcoMarks';
import FinderCta from '../../components/ui/FinderCta';
import CatalogLink, { CATALOG_PDF } from '../../components/ui/CatalogLink';

const normalise = (text) => String(text).toLocaleLowerCase('tr').replace(/\s+/g, '');

export default function ProductTables() {
  const { t } = useTranslation();
  const quoteFor = useModelQuote();
  const { code: lang } = useLanguage();
  const { openQuote } = useQuote();

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');

  const p = (key, options) => t(`productTables.${key}`, options);
  const totalModels = families.reduce((sum, family) => sum + family.rows.length, 0);

  const visible = useMemo(() => {
    const q = normalise(query);

    return families
      .filter((family) => group === 'all' || family.group === group)
      .map((family) => ({
        ...family,
        rows: q ? family.rows.filter((row) => normalise(row.code).includes(q)) : family.rows,
      }))
      .filter((family) => family.rows.length > 0);
  }, [query, group]);

  return (
    <main className="internalPage ptPage">
      <Seo
        title={t('meta.titles.productTables')}
        description={t('meta.descriptions.productTables')}
        breadcrumbs={[
          { name: t('meta.titles.products'), path: '/products' },
          { name: t('meta.titles.productTables'), path: '/product-tables' },
        ]}
      />

      <PageHeader
        crumbs={[
          { label: t('nav.products'), to: '/products' },
          { label: t('meta.titles.productTables') },
        ]}
        eyebrow={p('eyebrow')}
        title={p('title')}
        accent={p('titleAccent')}
        lead={p('intro')}
        actions={(
          <>
            <FinderCta tone="glass" />
            <CatalogLink placement="product_tables" />
          </>
        )}
        media={[
          { src: '/images/products/silo-tank.webp' },
          { src: '/images/products/textile-trolley.webp' },
          { src: '/images/products/pickle-tank.webp' },
        ]}
        facts={[
          { value: families.length, label: p('familiesLabel') },
          { value: totalModels, label: p('models') },
          { value: groups.length, label: p('groupsLabel') },
        ]}
      />

      <div className="ptBar">
        <div className="container ptBarInner">
          <label className="ptSearch">
            <Search aria-hidden="true" />
            <span className="visuallyHidden">{p('searchLabel')}</span>
            <input type="search" value={query} placeholder={p('searchPlaceholder')} onChange={(event) => setQuery(event.target.value)} />
          </label>

          <div className="ptGroups" role="group">
            {['all', ...groups].map((id) => (
              <button
                key={id}
                type="button"
                className={group === id ? 'active' : ''}
                aria-pressed={group === id}
                onClick={() => setGroup(id)}
              >
                {id === 'all' ? t('waterTanks.all') : p(`groups.${id}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="ptBody">
        <div className="container">
          {visible.length === 0 && <p className="ptEmpty">{p('noResults')}</p>}

          {groups.map((groupId) => {
            const list = visible.filter((family) => family.group === groupId);
            if (list.length === 0) return null;

            return (
              <div key={groupId} className="ptGroup">
                <h2 className="ptGroupTitle">
                  {p(`groups.${groupId}`)}
                  <span>{list.length}</span>
                </h2>

                {list.map((family) => {
                  const title = familyText(family, 'title', lang, t);

                  return (
                    <article key={family.id} className="ptFamily" id={family.id}>
                      <header className="ptFamilyHead">
                        {family.image && (
                          <span className="ptFamilyImage">
                            <img src={family.image} alt={title} loading="lazy" decoding="async" />
                          </span>
                        )}

                        <div className="ptFamilyText">
                          <h3>{title}</h3>
                          <p>{familyText(family, 'text', lang, t)}</p>

                          <div className="ptFamilyMeta">
                            <span>
                              {family.rows.length} {p('models')}
                            </span>
                            {family.waterTank && (
                              <LocalizedLink to="/water-tanks" className="ptFamilyLink">
                                {p('waterLink')}
                                <Arrow />
                              </LocalizedLink>
                            )}
                          </div>
                        </div>
                      </header>

                      <div className="ptTableWrap">
                        <table className="ptTable">
                          <thead>
                            <tr>
                              {family.columns.map((key) => (
                                <th key={key} scope="col">{p(`columns.${key}`)}</th>
                              ))}
                              <th scope="col"><span className="visuallyHidden">{p('quote')}</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {family.rows.map((row, index) => (
                              <tr key={`${row.code}-${index}`}>
                                {family.columns.map((key) =>
                                  key === 'code' ? (
                                    <th key={key} scope="row">
                                      <LocalizedLink to={modelPath(family, row)}>{row.code}</LocalizedLink>
                                    </th>
                                  ) : (
                                    <td key={key}>{formatNumber(row[key], lang)}</td>
                                  )
                                )}
                                <td>
                                  <span className="ptRowActions">
                                    <button type="button" className="ptRowQuote" onClick={() => openQuote(quoteFor(family, row))}>
                                      {p('quote')}
                                    </button>
                                    <AddToCartButton product={quoteFor(family, row)} compact />
                                    <CompareButton family={family} row={row} compact />
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })}

          <p className="ptSource">
            {p('source')}
            <a href={CATALOG_PDF} download className="sourceLink">{t('common.catalog')} (PDF)</a>
            <EcoBadge type="recycle" />
          </p>
        </div>
      </section>
    </main>
  );
}
