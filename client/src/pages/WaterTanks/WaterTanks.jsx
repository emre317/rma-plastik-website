import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Beaker, Check, Droplets, FlaskConical, LayoutGrid, MoveHorizontal, MoveVertical, RotateCcw,
  Search, SlidersHorizontal, Table2, UtensilsCrossed, Wand2, X,
} from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import useLanguage from '../../hooks/useLanguage';
import formatNumber from '../../utils/formatNumber';
import { modelPath, waterTanks, WATER_USES } from '../../data/productTables';
import useModelQuote from '../../hooks/useModelQuote';
import AddToCartButton from '../../components/quote/AddToCartButton';
import CompareButton from '../../components/compare/CompareButton';
import FinderCta from '../../components/ui/FinderCta';

// Every distinct volume is a stop on the volume slider
const VOLUME_STEPS = waterTanks.length ? [...new Set(waterTanks.map((tank) => tank.volume))].sort((a, b) => a - b) : [0];
const LAST = VOLUME_STEPS.length - 1;
const MAX_HEIGHT = Math.max(0, ...waterTanks.map((tank) => tank.height));
const MIN_HEIGHT = Math.min(MAX_HEIGHT, ...waterTanks.map((tank) => tank.height));
const MAX_DIAMETER = Math.max(0, ...waterTanks.map((tank) => tank.diameter));
const MIN_DIAMETER = Math.min(MAX_DIAMETER, ...waterTanks.map((tank) => tank.diameter));
const OUTLETS = [...new Set(waterTanks.map((tank) => tank.outlet).filter(Boolean))];
const USES = WATER_USES.filter((use) => waterTanks.some((tank) => tank.uses.includes(use)));
const TYPE_COUNT = new Set(waterTanks.map((tank) => `${tank.orientation}-${tank.layer}`)).size;
const percent = (value, min, max) => (max > min ? ((value - min) / (max - min)) * 100 : 100);

const USE_ICONS = { water: Droplets, food: UtensilsCrossed, chemical: FlaskConical, acid: Beaker };

const PRESETS = [
  [0, 1000],
  [1000, 5000],
  [5000, 15000],
  [15000, Infinity],
];

const snapIndex = (volume, mode) => {
  if (mode === 'min') {
    const index = VOLUME_STEPS.findIndex((step) => step >= volume);
    return index === -1 ? LAST : index;
  }

  let index = 0;
  VOLUME_STEPS.forEach((step, i) => {
    if (step <= volume) index = i;
  });
  return index;
};

const initialFilters = {
  query: '',
  use: 'all',
  orientation: 'all',
  layer: 'all',
  minIndex: 0,
  maxIndex: LAST,
  maxHeight: MAX_HEIGHT,
  maxDiameter: MAX_DIAMETER,
  outlet: 'all',
};

const SORTERS = {
  volumeAsc: (a, b) => a.volume - b.volume || a.height - b.height,
  volumeDesc: (a, b) => b.volume - a.volume || a.height - b.height,
  heightAsc: (a, b) => a.height - b.height,
  diameterAsc: (a, b) => a.diameter - b.diameter,
};

const normalise = (value) => String(value).toLocaleLowerCase('tr').replace(/\s+/g, '');

/* Does a tank pass the filters? `skip` leaves one filter out (facet counts) */
function matches(tank, filters, skip) {
  const query = normalise(filters.query);

  if (skip !== 'query' && query && !normalise(tank.code).includes(query)) return false;
  if (skip !== 'use' && filters.use !== 'all' && !tank.uses.includes(filters.use)) return false;
  if (skip !== 'orientation' && filters.orientation !== 'all' && tank.orientation !== filters.orientation) return false;
  if (skip !== 'layer' && filters.layer !== 'all' && tank.layer !== filters.layer) return false;
  if (skip !== 'volume' && (tank.volume < VOLUME_STEPS[filters.minIndex] || tank.volume > VOLUME_STEPS[filters.maxIndex])) return false;
  if (skip !== 'maxHeight' && tank.height > filters.maxHeight) return false;
  if (skip !== 'maxDiameter' && tank.diameter > filters.maxDiameter) return false;
  if (skip !== 'outlet' && filters.outlet !== 'all' && tank.outlet !== filters.outlet) return false;
  return true;
}

export default function WaterTanks() {
  const { t } = useTranslation();
  const quoteForModel = useModelQuote();
  const { code: lang } = useLanguage();
  const { openQuote } = useQuote();

  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState('volumeAsc');
  const [view, setView] = useState('cards');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const w = (key, options) => t(`waterTanks.${key}`, options);
  const col = (key) => t(`productTables.columns.${key}`);
  const num = (value) => formatNumber(value, lang);

  const update = (patch) => setFilters((current) => ({ ...current, ...patch }));
  const reset = () => setFilters(initialFilters);

  // Lock page scroll while the filter sheet is open on phones
  useEffect(() => {
    if (!filtersOpen) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => event.key === 'Escape' && setFiltersOpen(false);
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  const results = useMemo(
    () => waterTanks.filter((tank) => matches(tank, filters)).sort(SORTERS[sort]),
    [filters, sort]
  );

  // How many models an option would show, given the other filters
  const facet = (skip, test) => waterTanks.filter((tank) => matches(tank, filters, skip) && test(tank)).length;

  const activePreset = PRESETS.findIndex(
    ([min, max]) => filters.minIndex === snapIndex(min, 'min') && filters.maxIndex === snapIndex(max, 'max')
  );

  const features = t('waterTanks.features', { returnObjects: true });

  const rangeStyle = {
    '--from': `${percent(filters.minIndex, 0, LAST)}%`,
    '--to': `${LAST > 0 ? percent(filters.maxIndex, 0, LAST) : 100}%`,
  };

  // Model shown in the quote form / list (image, family and measurements)
  const quoteFor = (tank) => quoteForModel(tank.familyData, tank);
  const typeLabel = (tank) => `${w(tank.orientation)} · ${tank.layer === 'double' ? w('double') : w('single')}`;

  // Active filters as removable chips
  const active = [
    filters.query && { key: 'query', label: `${w('search')}: ${filters.query}`, clear: { query: '' } },
    filters.use !== 'all' && { key: 'use', label: w(`uses.${filters.use}`), clear: { use: 'all' } },
    filters.orientation !== 'all' && { key: 'orientation', label: w(filters.orientation), clear: { orientation: 'all' } },
    filters.layer !== 'all' && { key: 'layer', label: w(filters.layer), clear: { layer: 'all' } },
    (filters.minIndex > 0 || filters.maxIndex < LAST) && {
      key: 'volume',
      label: `${num(VOLUME_STEPS[filters.minIndex])} – ${num(VOLUME_STEPS[filters.maxIndex])} L`,
      clear: { minIndex: 0, maxIndex: LAST },
    },
    filters.maxHeight < MAX_HEIGHT && { key: 'maxHeight', label: `${col('height')} ≤ ${filters.maxHeight}`, clear: { maxHeight: MAX_HEIGHT } },
    filters.maxDiameter < MAX_DIAMETER && { key: 'maxDiameter', label: `${col('diameter')} ≤ ${filters.maxDiameter}`, clear: { maxDiameter: MAX_DIAMETER } },
    filters.outlet !== 'all' && { key: 'outlet', label: `${col('outlet')}: ${filters.outlet}`, clear: { outlet: 'all' } },
  ].filter(Boolean);

  const option = (name, value, label, count, hint) => {
    const selected = filters[name] === value;

    return (
      <button
        type="button"
        className={`wtOption ${selected ? 'active' : ''}`}
        aria-pressed={selected}
        disabled={!selected && count === 0}
        onClick={() => update({ [name]: value })}
      >
        <span className="wtOptionText">
          <span>{label}</span>
          {hint && <small>{hint}</small>}
        </span>
        <span className="wtOptionCount">{count}</span>
      </button>
    );
  };

  const cards = results.map((tank) => (
    <li key={tank.code} className="wtCard">
      <LocalizedLink to={modelPath(tank.familyData, tank)} className="wtCardMedia">
        <img src={tank.image} alt={`${tank.code} – ${num(tank.volume)} L`} loading="lazy" decoding="async" />
        <span className="wtCardType">{typeLabel(tank)}</span>
      </LocalizedLink>

      <div className="wtCardBody">
        <div className="wtCardTitle">
          <h3>
            <LocalizedLink to={modelPath(tank.familyData, tank)}>{tank.code}</LocalizedLink>
          </h3>
          <strong>
            {num(tank.volume)}
            <small> L</small>
          </strong>
        </div>

        <ul className="wtDims">
          <li title={col('diameter')}>
            <span>Ø</span>
            {tank.diameter}
          </li>
          <li title={col('height')}>
            <MoveVertical aria-hidden="true" />
            {tank.height}
          </li>
          {tank.length && (
            <li title={col('length')}>
              <MoveHorizontal aria-hidden="true" />
              {tank.length}
            </li>
          )}
          <li className="wtDimsUnit">cm</li>
        </ul>

        <ul className="wtUses" aria-label={w('use')}>
          {tank.uses.map((use) => (
            <li key={use}>{w(`uses.${use}`)}</li>
          ))}
        </ul>

        <div className="wtCardActions">
          <button type="button" className="wtQuote" onClick={() => openQuote(quoteFor(tank))}>
            {w('quote')}
            <Arrow />
          </button>
          <AddToCartButton product={quoteFor(tank)} compact iconOnly />
          <CompareButton family={tank.familyData} row={tank} compact iconOnly />
        </div>
      </div>
    </li>
  ));

  // A help card after the sixth model
  if (cards.length > 6) {
    cards.splice(6, 0, (
      <li key="help" className="wtHelpCard">
        <span className="wtHelpIcon" aria-hidden="true"><Wand2 /></span>
        <h3>{w('helpTitle')}</h3>
        <p>{w('helpText')}</p>
        <LocalizedLink to="/tank-finder" className="wtHelpLink">
          {t('finder.cta')}
          <Arrow />
        </LocalizedLink>
      </li>
    ));
  }

  return (
    <main className="internalPage wtPage">
      <Seo
        title={t('meta.titles.waterTanks')}
        description={t('meta.descriptions.waterTanks')}
        breadcrumbs={[
          { name: t('meta.titles.products'), path: '/products' },
          { name: t('meta.titles.waterTanks'), path: '/water-tanks' },
        ]}
      />

      <PageHeader
        crumbs={[
          { label: t('nav.products'), to: '/products' },
          { label: t('nav.waterTanks') },
        ]}
        eyebrow={w('eyebrow')}
        title={w('title')}
        accent={w('titleAccent')}
        lead={w('intro')}
        actions={<FinderCta tone="glass" />}
        media={[
          { src: '/images/products/rd-15000.webp' },
          { src: '/images/products/ry-1000.webp' },
          { src: '/images/products/sd-set.webp' },
        ]}
        facts={[
          { value: waterTanks.length, label: w('statModels') },
          { value: `${num(VOLUME_STEPS[0])} – ${num(VOLUME_STEPS[LAST])} L`, label: w('statRange') },
          { value: TYPE_COUNT, label: w('statTypes') },
        ]}
      />

      {/* Step 1: what will be stored */}
      <section className="wtUseBar" aria-labelledby="wt-use-title">
        <div className="container">
          <h2 id="wt-use-title">{w('useQuestion')}</h2>
          <div className="wtUseTiles" role="group">
            {[ 'all', ...USES ].map((use) => {
              const Icon = USE_ICONS[use] || LayoutGrid;
              const selected = filters.use === use;
              const count = use === 'all' ? facet('use', () => true) : facet('use', (tank) => tank.uses.includes(use));

              return (
                <button
                  key={use}
                  type="button"
                  className={`wtUseTile ${selected ? 'active' : ''}`}
                  aria-pressed={selected}
                  onClick={() => update({ use })}
                >
                  <span className="wtUseIcon" aria-hidden="true"><Icon /></span>
                  <span className="wtUseText">
                    <strong>{use === 'all' ? w('allUses') : w(`uses.${use}`)}</strong>
                    <small>{w('modelCount', { count })}</small>
                  </span>
                  {selected && <Check className="wtUseCheck" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="wtFinder">
        <div className="container">
          <div className="wtLayout">

            {/* Filters (a sheet on phones) */}
            <div className={`wtSheetBackdrop ${filtersOpen ? 'open' : ''}`} onClick={() => setFiltersOpen(false)} aria-hidden="true" />

            <aside className={`wtFilters ${filtersOpen ? 'open' : ''}`} aria-label={w('filters')}>
              <div className="wtFiltersHead">
                <h2>
                  <SlidersHorizontal aria-hidden="true" />
                  {w('filters')}
                  {active.length > 0 && <span className="wtBadge">{active.length}</span>}
                </h2>
                {active.length > 0 && (
                  <button type="button" className="wtReset" onClick={reset}>
                    <RotateCcw aria-hidden="true" />
                    {w('resetShort')}
                  </button>
                )}
                <button type="button" className="wtSheetClose" onClick={() => setFiltersOpen(false)} aria-label={w('hideFilters')}>
                  <X aria-hidden="true" />
                </button>
              </div>

              <div className="wtFiltersBody">
                <label className="wtSearch">
                  <span className="wtFilterLabel">{w('search')}</span>
                  <span className="wtSearchField">
                    <Search aria-hidden="true" />
                    <input
                      type="search"
                      value={filters.query}
                      placeholder={w('searchPlaceholder')}
                      onChange={(event) => update({ query: event.target.value })}
                    />
                  </span>
                </label>

                <fieldset className="wtGroup">
                  <legend className="wtFilterLabel">{w('orientation')}</legend>
                  <div className="wtSegment">
                    {['all', 'vertical', 'horizontal'].map((value) => {
                      const count = facet('orientation', (tank) => value === 'all' || tank.orientation === value);
                      const selected = filters.orientation === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          className={selected ? 'active' : ''}
                          aria-pressed={selected}
                          disabled={!selected && count === 0}
                          onClick={() => update({ orientation: value })}
                        >
                          {w(value)}
                          <small>{count}</small>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="wtGroup">
                  <legend className="wtFilterLabel">{w('layer')}</legend>
                  <div className="wtOptions">
                    {option('layer', 'all', w('all'), facet('layer', () => true))}
                    {option('layer', 'single', w('single'), facet('layer', (tank) => tank.layer === 'single'), w('singleHint'))}
                    {option('layer', 'double', w('double'), facet('layer', (tank) => tank.layer === 'double'), w('doubleHint'))}
                  </div>
                </fieldset>

                <fieldset className="wtGroup">
                  <legend className="wtFilterLabel">{w('volume')}</legend>

                  <div className="wtRangeValues">
                    <span>
                      <small>{w('min')}</small>
                      <strong>{num(VOLUME_STEPS[filters.minIndex])} L</strong>
                    </span>
                    <span>
                      <small>{w('max')}</small>
                      <strong>{num(VOLUME_STEPS[filters.maxIndex])} L</strong>
                    </span>
                  </div>

                  <div className="wtRange" style={rangeStyle}>
                    <input
                      type="range"
                      min="0"
                      max={LAST}
                      value={filters.minIndex}
                      aria-label={`${w('volume')} – ${w('min')}`}
                      onChange={(event) => update({ minIndex: Math.min(Number(event.target.value), filters.maxIndex) })}
                    />
                    <input
                      type="range"
                      min="0"
                      max={LAST}
                      value={filters.maxIndex}
                      aria-label={`${w('volume')} – ${w('max')}`}
                      onChange={(event) => update({ maxIndex: Math.max(Number(event.target.value), filters.minIndex) })}
                    />
                  </div>

                  <div className="wtPresets">
                    {PRESETS.map(([min, max], index) => (
                      <button
                        key={min}
                        type="button"
                        className={activePreset === index ? 'active' : ''}
                        aria-pressed={activePreset === index}
                        onClick={() =>
                          activePreset === index
                            ? update({ minIndex: 0, maxIndex: LAST })
                            : update({ minIndex: snapIndex(min, 'min'), maxIndex: snapIndex(max, 'max') })
                        }
                      >
                        {max === Infinity ? `${num(min)}+` : min === 0 ? `≤ ${num(max)}` : `${num(min)} – ${num(max)}`}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="wtGroup">
                  <legend className="wtFilterLabel">{w('spaceTitle')}</legend>
                  <p className="wtGroupHint">{w('spaceHint')}</p>

                  <label className="wtSliderField">
                    <span>
                      {w('maxHeight')}
                      <em>{filters.maxHeight >= MAX_HEIGHT ? w('noLimit') : `≤ ${filters.maxHeight} cm`}</em>
                    </span>
                    <input
                      className="wtSlider"
                      type="range"
                      min={MIN_HEIGHT}
                      max={MAX_HEIGHT}
                      step="1"
                      value={filters.maxHeight}
                      style={{ '--fill': `${percent(filters.maxHeight, MIN_HEIGHT, MAX_HEIGHT)}%` }}
                      onChange={(event) => update({ maxHeight: Number(event.target.value) })}
                    />
                  </label>

                  <label className="wtSliderField">
                    <span>
                      {w('maxDiameter')}
                      <em>{filters.maxDiameter >= MAX_DIAMETER ? w('noLimit') : `≤ ${filters.maxDiameter} cm`}</em>
                    </span>
                    <input
                      className="wtSlider"
                      type="range"
                      min={MIN_DIAMETER}
                      max={MAX_DIAMETER}
                      step="1"
                      value={filters.maxDiameter}
                      style={{ '--fill': `${percent(filters.maxDiameter, MIN_DIAMETER, MAX_DIAMETER)}%` }}
                      onChange={(event) => update({ maxDiameter: Number(event.target.value) })}
                    />
                  </label>
                </fieldset>

                <fieldset className="wtGroup">
                  <legend className="wtFilterLabel">{w('outlet')}</legend>
                  <div className="wtPresets">
                    {['all', ...OUTLETS].map((outlet) => {
                      const selected = filters.outlet === outlet;
                      const count = facet('outlet', (tank) => outlet === 'all' || tank.outlet === outlet);

                      return (
                        <button
                          key={outlet}
                          type="button"
                          className={selected ? 'active' : ''}
                          aria-pressed={selected}
                          disabled={!selected && count === 0}
                          onClick={() => update({ outlet })}
                        >
                          <span dir="ltr">{outlet === 'all' ? w('all') : outlet}</span>
                          <small>{count}</small>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <div className="wtSheetFoot">
                <button type="button" className="wtReset" onClick={reset} disabled={active.length === 0}>
                  {w('resetShort')}
                </button>
                <button type="button" className="button primary" onClick={() => setFiltersOpen(false)}>
                  <span>{w('showResults', { count: results.length })}</span>
                </button>
              </div>
            </aside>

            {/* Results */}
            <div className="wtResults">
              <div className="wtToolbar">
                <button type="button" className="wtFilterToggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(true)}>
                  <SlidersHorizontal aria-hidden="true" />
                  {w('filters')}
                  {active.length > 0 && <span className="wtBadge">{active.length}</span>}
                </button>

                <p className="wtCount" aria-live="polite">
                  <strong>{results.length}</strong> {w('resultsOf', { total: waterTanks.length })}
                </p>

                <label className="wtSort">
                  <span>{w('sort')}</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value)}>
                    {Object.keys(SORTERS).map((key) => (
                      <option key={key} value={key}>
                        {w(`sortOptions.${key}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="wtView" role="group">
                  <button type="button" aria-pressed={view === 'cards'} className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')} title={w('cards')}>
                    <LayoutGrid aria-hidden="true" />
                    <span>{w('cards')}</span>
                  </button>
                  <button type="button" aria-pressed={view === 'table'} className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} title={w('table')}>
                    <Table2 aria-hidden="true" />
                    <span>{w('table')}</span>
                  </button>
                </div>
              </div>

              {active.length > 0 && (
                <div className="wtActive">
                  {active.map((item) => (
                    <button key={item.key} type="button" onClick={() => update(item.clear)}>
                      {item.label}
                      <X aria-hidden="true" />
                    </button>
                  ))}
                  <button type="button" className="wtActiveClear" onClick={reset}>
                    {w('reset')}
                  </button>
                </div>
              )}

              {results.length === 0 && (
                <div className="wtEmpty">
                  <span className="wtHelpIcon" aria-hidden="true"><Search /></span>
                  <h3>{w('noResults')}</h3>
                  <p>{w('noResultsHint')}</p>
                  <div>
                    <button type="button" className="button primary" onClick={reset}>
                      <span>{w('reset')}</span>
                    </button>
                    <button type="button" className="wtTextLink" onClick={() => openQuote(t('contact.customRequirement'))}>
                      {w('contact')}
                      <Arrow />
                    </button>
                  </div>
                </div>
              )}

              {results.length > 0 && view === 'cards' && <ul className="wtCards">{cards}</ul>}

              {results.length > 0 && view === 'table' && (
                <div className="ptTableWrap">
                  <table className="ptTable">
                    <thead>
                      <tr>
                        {['code', 'volume', 'diameter', 'height', 'length', 'cap', 'outlet'].map((key) => (
                          <th key={key} scope="col">{col(key)}</th>
                        ))}
                        <th scope="col">{w('orientation')}</th>
                        <th scope="col"><span className="visuallyHidden">{w('quote')}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((tank) => (
                        <tr key={tank.code}>
                          <th scope="row">
                            <LocalizedLink to={modelPath(tank.familyData, tank)}>{tank.code}</LocalizedLink>
                          </th>
                          <td>{num(tank.volume)}</td>
                          <td>{tank.diameter}</td>
                          <td>{tank.height}</td>
                          <td>{tank.length ?? '–'}</td>
                          <td>{tank.cap}</td>
                          <td>{tank.outlet ?? '–'}</td>
                          <td>{typeLabel(tank)}</td>
                          <td>
                            <span className="ptRowActions">
                              <button type="button" className="ptRowQuote" onClick={() => openQuote(quoteFor(tank))}>
                                {w('quote')}
                              </button>
                              <AddToCartButton product={quoteFor(tank)} compact />
                              <CompareButton family={tank.familyData} row={tank} compact />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="wtStandard">
        <div className="container">
          <div className="wtStandardPanel">
            <div>
              <p className="eyebrow">{w('standardTitle')}</p>
              <ul className="wtFeatures">
                {Array.isArray(features) &&
                  features.map((feature) => (
                    <li key={feature}>
                      <Check aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
              </ul>
            </div>

            <div className="wtStandardLinks">
              <LocalizedLink to="/product-tables" className="button primary">
                <span>{w('allTables')}</span>
                <Arrow className="buttonArrow" />
              </LocalizedLink>
              <button type="button" className="wtTextLink" onClick={() => openQuote(t('contact.customRequirement'))}>
                {w('contact')}
                <Arrow />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
