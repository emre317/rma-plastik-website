import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gauge, ListTree, RotateCcw, Search, X } from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import Dropdown from '../../components/ui/Dropdown';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import useLanguage from '../../hooks/useLanguage';
import formatNumber from '../../utils/formatNumber';
import families, { familyText, modelPath } from '../../data/productTables';
import portfolio from '../../data/productPortfolio';
import useModelQuote from '../../hooks/useModelQuote';
import useTableFit from '../../hooks/useTableFit';
import AddToCartButton from '../../components/quote/AddToCartButton';
import CompareButton from '../../components/compare/CompareButton';
import { EcoBadge } from '../../components/ui/EcoMarks';
import FinderCta from '../../components/ui/FinderCta';
import CatalogLink, { CATALOG_PDF } from '../../components/ui/CatalogLink';

// Tables are listed under their product group; tables of no shown group under "Diğer"
const groupOf = (family) => portfolio.find((group) => group.families.includes(family.id))?.id || 'other';
const groups = [
  ...portfolio.filter((group) => group.members.length > 0).map((group) => group.id),
  ...(families.some((family) => groupOf(family) === 'other') ? ['other'] : []),
];

const normalise = (text) => String(text).toLocaleLowerCase('tr').replace(/\s+/g, '');

// Volume filter of the tables (litres)
const VOLUME_RANGES = {
  small: [0, 1000],
  medium: [1001, 5000],
  large: [5001, 15000],
  xlarge: [15001, Infinity],
};

export default function ProductTables() {
  const { t } = useTranslation();
  const quoteFor = useModelQuote();
  const { code: lang } = useLanguage();
  const { openQuote } = useQuote();
  const fitTable = useTableFit();

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [volume, setVolume] = useState('all');

  const p = (key, options) => t(`productTables.${key}`, options);
  const groupLabel = (id) => (id === 'other' ? p('groups.other') : t(`productExplorer.items.${id}.label`));
  const totalModels = families.reduce((sum, family) => sum + family.rows.length, 0);

  const visible = useMemo(() => {
    const q = normalise(query);

    const [min, max] = VOLUME_RANGES[volume] || [];

    return families
      .filter((family) => group === 'all' || groupOf(family) === group)
      .map((family) => ({
        ...family,
        onRequest: family.rows.length === 0,
        rows: family.rows.filter((row) =>
          (!q || normalise(row.code).includes(q)) &&
          (volume === 'all' || (typeof row.volume === 'number' && row.volume >= min && row.volume <= max))
        ),
      }))
      // Tables without models ("on request") show only while no code / volume filter is used
      .filter((family) => family.rows.length > 0 || (family.onRequest && !q && volume === 'all'));
  }, [query, group, volume]);

  const shownModels = visible.reduce((sum, family) => sum + family.rows.length, 0);
  const filtered = query || group !== 'all' || volume !== 'all';
  const groupCount = (id) => families
    .filter((family) => id === 'all' || groupOf(family) === id)
    .reduce((sum, family) => sum + family.rows.length, 0);

  const jumpTo = (id) => {
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
            {query && (
              <button type="button" className="ptSearchClear" onClick={() => setQuery('')} aria-label={t('waterTanks.resetShort')}>
                <X aria-hidden="true" />
              </button>
            )}
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
                {id === 'all' ? t('waterTanks.all') : groupLabel(id)}
                <small>{groupCount(id)}</small>
              </button>
            ))}
          </div>

          <Dropdown
            className="ptSelect"
            value={volume}
            onChange={setVolume}
            label={t('waterTanks.volume')}
            icon={Gauge}
            options={[
              { value: 'all', label: p('volumeAll') },
              ...Object.entries(VOLUME_RANGES).map(([key, [min, max]]) => ({
                value: key,
                label: max === Infinity ? `${formatNumber(min - 1, lang)} L +` : `${formatNumber(min, lang)} – ${formatNumber(max, lang)} L`,
              })),
            ]}
          />

          <Dropdown
            className="ptSelect ptJump"
            value=""
            onChange={(id) => id && jumpTo(id)}
            label={p('jumpLabel')}
            placeholder={p('jumpLabel')}
            icon={ListTree}
            align="end"
            options={visible.map((family) => ({ value: family.id, label: familyText(family, 'title', lang, t) }))}
          />
        </div>

        <div className="container ptBarStatus" aria-live="polite">
          <span>{p('showing', { count: shownModels, total: totalModels })}</span>
          {filtered && (
            <button type="button" onClick={() => { setQuery(''); setGroup('all'); setVolume('all'); }}>
              <RotateCcw aria-hidden="true" />
              {t('waterTanks.reset')}
            </button>
          )}
        </div>
      </div>

      <section className="ptBody">
        <div className="container ptLayout">
          <nav className="ptToc" aria-label={p('jumpLabel')}>
            <span className="ptTocTitle">{p('tocTitle')}</span>
            {groups.map((groupId) => {
              const list = visible.filter((family) => groupOf(family) === groupId);
              if (list.length === 0) return null;

              return (
                <div key={groupId} className="ptTocGroup">
                  <span>{groupLabel(groupId)}</span>
                  <ul>
                    {list.map((family) => (
                      <li key={family.id}>
                        <a href={`#${family.id}`} onClick={(event) => { event.preventDefault(); jumpTo(family.id); }}>
                          {familyText(family, 'title', lang, t)}
                          <small>{family.rows.length || '–'}</small>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className="ptMain">
          {visible.length === 0 && (
            <div className="wtEmpty">
              <span className="wtHelpIcon" aria-hidden="true"><Search /></span>
              <h3>{p('noResults')}</h3>
              <button type="button" className="button primary" onClick={() => { setQuery(''); setGroup('all'); setVolume('all'); }}>
                <span>{t('waterTanks.reset')}</span>
              </button>
            </div>
          )}

          {groups.map((groupId) => {
            const list = visible.filter((family) => groupOf(family) === groupId);
            if (list.length === 0) return null;

            return (
              <div key={groupId} className="ptGroup">
                <h2 className="ptGroupTitle">
                  {groupLabel(groupId)}
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
                              {family.onRequest ? t('productExplorer.onRequest') : `${family.rows.length} ${p('models')}`}
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

                      {family.onRequest ? (
                        <div className="ptOnRequest">
                          <p>{t('pages.industries.onRequestText')}</p>
                          <button type="button" className="button primary quoteButton" onClick={() => openQuote(title)}>
                            <span>{p('quote')}</span>
                            <Arrow className="buttonArrow" />
                          </button>
                        </div>
                      ) : (
                      <div className="ptTableWrap" ref={fitTable}>
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
                                    <td key={key} data-label={p(`columns.${key}`)}>{formatNumber(row[key], lang)}</td>
                                  )
                                )}
                                <td className="ptActionsCell">
                                  <span className="ptRowActions">
                                    <button type="button" className="ptRowQuote" onClick={() => openQuote(quoteFor(family, row))}>
                                      {p('quote')}
                                    </button>
                                    <AddToCartButton product={quoteFor(family, row)} compact iconOnly />
                                    <CompareButton family={family} row={row} compact iconOnly />
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      )}
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
        </div>
      </section>
    </main>
  );
}
