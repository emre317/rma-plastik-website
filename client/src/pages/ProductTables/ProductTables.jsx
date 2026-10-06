import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

import Seo from '../../seo/Seo';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import useLanguage from '../../hooks/useLanguage';
import formatNumber from '../../utils/formatNumber';
import families, { groups } from '../../data/productTables';

const WATER_FAMILIES = ['vertical-tanks', 'horizontal-tanks', 'two-layer-vertical', 'two-layer-horizontal'];

const normalise = (text) => String(text).toLocaleLowerCase('tr').replace(/\s+/g, '');

export default function ProductTables() {
  const { t, i18n } = useTranslation();
  const { code: lang } = useLanguage();
  const { openQuote } = useQuote();

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');

  const p = (key, options) => t(`productTables.${key}`, options);
  const meta = p('meta', { returnObjects: true });
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

      <section className="internalHero ptHero">
        <div className="container">
          <div className="internalHeroMeta">
            <span>{meta[0]}</span>
            <span>{meta[1]}</span>
          </div>

          <div className="internalHeroGrid">
            <p className="eyebrow">{p('eyebrow')}</p>
            <h1>
              {p('title')}
              <span>{p('titleAccent')}</span>
            </h1>
          </div>

          <div className="ptHeroBottom">
            <p>{p('intro')}</p>
            <dl>
              <div>
                <dt>{families.length}</dt>
                <dd>{p('familiesLabel')}</dd>
              </div>
              <div>
                <dt>{totalModels}</dt>
                <dd>{p('models')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

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
                  const title = p(`families.${family.id}.title`);

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
                          <p>{p(`families.${family.id}.text`)}</p>

                          <div className="ptFamilyMeta">
                            <span>
                              {family.rows.length} {p('models')}
                            </span>
                            {WATER_FAMILIES.includes(family.id) && (
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
                                    <th key={key} scope="row">{row.code}</th>
                                  ) : (
                                    <td key={key}>{formatNumber(row[key], lang)}</td>
                                  )
                                )}
                                <td>
                                  <button type="button" className="ptRowQuote" onClick={() =>
                                      openQuote({
                                        name: `${i18n.getFixedT('tr')(`productTables.families.${family.id}.title`)} – ${row.code}`,
                                        title,
                                        code: row.code,
                                        image: family.image || '',
                                        capacity: typeof row.volume === 'number' ? `${formatNumber(row.volume, lang)} L` : '',
                                        specs: family.columns
                                          .filter((key) => key !== 'code' && key !== 'volume' && row[key] !== undefined)
                                          .map((key) => ({ label: p(`columns.${key}`), value: formatNumber(row[key], lang) })),
                                        summary: [
                                          i18n.getFixedT('tr')(`productTables.families.${family.id}.title`),
                                          row.code,
                                          ...family.columns
                                            .filter((key) => key !== 'code' && row[key] !== undefined)
                                            .map((key) => `${i18n.getFixedT('tr')(`productTables.columns.${key}`)}: ${formatNumber(row[key], 'tr')}`),
                                        ],
                                      })
                                    }>
                                    {p('quote')}
                                  </button>
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

          <p className="ptSource">{p('source')}</p>
        </div>
      </section>
    </main>
  );
}
