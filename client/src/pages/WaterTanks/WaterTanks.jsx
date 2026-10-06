import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, LayoutGrid, RotateCcw, Search, SlidersHorizontal, Table2, Wand2 } from 'lucide-react';

import Seo from '../../seo/Seo';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import useLanguage from '../../hooks/useLanguage';
import formatNumber from '../../utils/formatNumber';
import { modelPath, waterTanks, WATER_USES } from '../../data/productTables';
import useModelQuote from '../../hooks/useModelQuote';
import AddToCartButton from '../../components/quote/AddToCartButton';
import CompareButton from '../../components/compare/CompareButton';

// Every distinct volume is a stop on the volume slider
const VOLUME_STEPS = waterTanks.length ? [...new Set(waterTanks.map((tank) => tank.volume))].sort((a, b) => a - b) : [0];
const MAX_HEIGHT = Math.max(0, ...waterTanks.map((tank) => tank.height));
const MIN_HEIGHT = Math.min(MAX_HEIGHT, ...waterTanks.map((tank) => tank.height));
const MAX_DIAMETER = Math.max(0, ...waterTanks.map((tank) => tank.diameter));
const MIN_DIAMETER = Math.min(MAX_DIAMETER, ...waterTanks.map((tank) => tank.diameter));
const OUTLETS = [...new Set(waterTanks.map((tank) => tank.outlet).filter(Boolean))];
const USES = WATER_USES.filter((use) => waterTanks.some((tank) => tank.uses.includes(use)));
const TYPE_COUNT = new Set(waterTanks.map((tank) => `${tank.orientation}-${tank.layer}`)).size;
const percent = (value, min, max) => (max > min ? ((value - min) / (max - min)) * 100 : 100);

const PRESETS = [
  [0, 1000],
  [1000, 5000],
  [5000, 15000],
  [15000, Infinity],
];

const snapIndex = (volume, mode) => {
  if (mode === 'min') {
    const index = VOLUME_STEPS.findIndex((step) => step >= volume);
    return index === -1 ? VOLUME_STEPS.length - 1 : index;
  }

  let index = 0;
  VOLUME_STEPS.forEach((step, i) => {
    if (step <= volume) index = i;
  });
  return index;
};

const initialFilters = {
  query: '',
  orientation: 'all',
  layer: 'all',
  uses: [],
  minIndex: 0,
  maxIndex: VOLUME_STEPS.length - 1,
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

  const toggleUse = (use) =>
    update({
      uses: filters.uses.includes(use) ? filters.uses.filter((item) => item !== use) : [...filters.uses, use],
    });

  const results = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase('tr').replace(/\s+/g, '');
    const minVolume = VOLUME_STEPS[filters.minIndex];
    const maxVolume = VOLUME_STEPS[filters.maxIndex];

    return waterTanks
      .filter((tank) => {
        if (query && !tank.code.toLocaleLowerCase('tr').replace(/\s+/g, '').includes(query)) return false;
        if (filters.orientation !== 'all' && tank.orientation !== filters.orientation) return false;
        if (filters.layer !== 'all' && tank.layer !== filters.layer) return false;
        if (filters.uses.some((use) => !tank.uses.includes(use))) return false;
        if (tank.volume < minVolume || tank.volume > maxVolume) return false;
        if (tank.height > filters.maxHeight) return false;
        if (tank.diameter > filters.maxDiameter) return false;
        if (filters.outlet !== 'all' && tank.outlet !== filters.outlet) return false;
        return true;
      })
      .sort(SORTERS[sort]);
  }, [filters, sort]);

  const activePreset = PRESETS.findIndex(
    ([min, max]) => filters.minIndex === snapIndex(min, 'min') && filters.maxIndex === snapIndex(max, 'max')
  );

  const changed = JSON.stringify(filters) !== JSON.stringify(initialFilters);

  const meta = t('waterTanks.meta', { returnObjects: true });
  const features = t('waterTanks.features', { returnObjects: true });

  const rangeStyle = {
    '--from': `${percent(filters.minIndex, 0, VOLUME_STEPS.length - 1)}%`,
    '--to': `${VOLUME_STEPS.length > 1 ? percent(filters.maxIndex, 0, VOLUME_STEPS.length - 1) : 100}%`,
  };

  const badges = (tank) => [
    w(tank.orientation),
    tank.layer === 'double' ? w('double') : w('single'),
  ];

  // Model shown in the quote form / cart (image, family and measurements)
  const quoteFor = (tank) => quoteForModel(tank.familyData, tank);

  const choice = (name, value, label, hint) => (
    <button
      type="button"
      className={`wtChoice ${filters[name] === value ? 'active' : ''}`}
      aria-pressed={filters[name] === value}
      onClick={() => update({ [name]: value })}
    >
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </button>
  );

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

      <section className="internalHero internalHeroDark wtHero">
        <div className="container">
          <div className="internalHeroMeta">
            <span>{meta[0]}</span>
            <span>{meta[1]}</span>
          </div>

          <div className="internalHeroGrid">
            <p className="eyebrow">{w('eyebrow')}</p>
            <h1>
              {w('title')}
              <span>{w('titleAccent')}</span>
            </h1>
          </div>

          <div className="wtHeroBottom">
            <div className="wtHeroIntro">
              <p>{w('intro')}</p>
              <LocalizedLink to="/tank-finder" className="wtFinderCta">
                <span className="wtFinderCtaIcon" aria-hidden="true"><Wand2 /></span>
                <span>
                  <strong>{t('finder.cta')}</strong>
                  <small>{t('finder.ctaText')}</small>
                </span>
                <Arrow />
              </LocalizedLink>
            </div>

            <dl className="wtHeroStats">
              <div>
                <dt>{waterTanks.length}</dt>
                <dd>{w('statModels')}</dd>
              </div>
              <div>
                <dt>
                  {num(VOLUME_STEPS[0])} – {num(VOLUME_STEPS[VOLUME_STEPS.length - 1])} L
                </dt>
                <dd>{w('statRange')}</dd>
              </div>
              <div>
                <dt>{TYPE_COUNT}</dt>
                <dd>{w('statTypes')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="wtFinder">
        <div className="container">
          <div className="wtLayout">

            {/* Filters */}
            <aside className={`wtFilters ${filtersOpen ? 'open' : ''}`} aria-label={w('filters')}>
              <div className="wtFiltersHead">
                <h2>
                  <SlidersHorizontal aria-hidden="true" />
                  {w('filters')}
                </h2>
                {changed && (
                  <button type="button" className="wtReset" onClick={() => setFilters(initialFilters)}>
                    <RotateCcw aria-hidden="true" />
                    {w('reset')}
                  </button>
                )}
              </div>

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
                <div className="wtChoices three">
                  {choice('orientation', 'all', w('all'))}
                  {choice('orientation', 'vertical', w('vertical'))}
                  {choice('orientation', 'horizontal', w('horizontal'))}
                </div>
              </fieldset>

              <fieldset className="wtGroup">
                <legend className="wtFilterLabel">{w('layer')}</legend>
                <div className="wtChoices stack">
                  {choice('layer', 'all', w('all'))}
                  {choice('layer', 'single', w('single'), w('singleHint'))}
                  {choice('layer', 'double', w('double'), w('doubleHint'))}
                </div>
              </fieldset>

              <fieldset className="wtGroup">
                <legend className="wtFilterLabel">{w('use')}</legend>
                <div className="wtChips">
                  {USES.map((use) => {
                    const on = filters.uses.includes(use);
                    return (
                      <button key={use} type="button" className={`wtChip ${on ? 'active' : ''}`} aria-pressed={on} onClick={() => toggleUse(use)}>
                        {on && <Check aria-hidden="true" />}
                        {w(`uses.${use}`)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="wtGroup">
                <legend className="wtFilterLabel">{w('volume')}</legend>

                <div className="wtRangeValues">
                  <strong>{num(VOLUME_STEPS[filters.minIndex])}</strong>
                  <span>—</span>
                  <strong>{num(VOLUME_STEPS[filters.maxIndex])}</strong>
                </div>

                <div className="wtRange" style={rangeStyle}>
                  <input
                    type="range"
                    min="0"
                    max={VOLUME_STEPS.length - 1}
                    value={filters.minIndex}
                    aria-label={`${w('volume')} min`}
                    onChange={(event) => update({ minIndex: Math.min(Number(event.target.value), filters.maxIndex) })}
                  />
                  <input
                    type="range"
                    min="0"
                    max={VOLUME_STEPS.length - 1}
                    value={filters.maxIndex}
                    aria-label={`${w('volume')} max`}
                    onChange={(event) => update({ maxIndex: Math.max(Number(event.target.value), filters.minIndex) })}
                  />
                </div>

                <span className="wtFilterLabel wtSubLabel">{w('presets')}</span>
                <div className="wtChips">
                  {PRESETS.map(([min, max], index) => (
                    <button
                      key={min}
                      type="button"
                      className={`wtChip ${activePreset === index ? 'active' : ''}`}
                      aria-pressed={activePreset === index}
                      onClick={() =>
                        activePreset === index
                          ? update({ minIndex: 0, maxIndex: VOLUME_STEPS.length - 1 })
                          : update({ minIndex: snapIndex(min, 'min'), maxIndex: snapIndex(max, 'max') })
                      }
                    >
                      {max === Infinity ? `${num(min)}+` : min === 0 ? `≤ ${num(max)}` : `${num(min)} – ${num(max)}`}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="wtGroup">
                <legend className="wtFilterLabel">
                  {w('maxHeight')}
                  <em>{filters.maxHeight >= MAX_HEIGHT ? w('noLimit') : `${filters.maxHeight} cm`}</em>
                </legend>
                <input
                  className="wtSlider"
                  type="range"
                  min={MIN_HEIGHT}
                  max={MAX_HEIGHT}
                  step="1"
                  value={filters.maxHeight}
                  style={{ '--fill': `${percent(filters.maxHeight, MIN_HEIGHT, MAX_HEIGHT)}%` }}
                  aria-label={w('maxHeight')}
                  onChange={(event) => update({ maxHeight: Number(event.target.value) })}
                />
              </fieldset>

              <fieldset className="wtGroup">
                <legend className="wtFilterLabel">
                  {w('maxDiameter')}
                  <em>{filters.maxDiameter >= MAX_DIAMETER ? w('noLimit') : `${filters.maxDiameter} cm`}</em>
                </legend>
                <input
                  className="wtSlider"
                  type="range"
                  min={MIN_DIAMETER}
                  max={MAX_DIAMETER}
                  step="1"
                  value={filters.maxDiameter}
                  style={{ '--fill': `${percent(filters.maxDiameter, MIN_DIAMETER, MAX_DIAMETER)}%` }}
                  aria-label={w('maxDiameter')}
                  onChange={(event) => update({ maxDiameter: Number(event.target.value) })}
                />
              </fieldset>

              <fieldset className="wtGroup">
                <legend className="wtFilterLabel">{w('outlet')}</legend>
                <div className="wtChips">
                  {['all', ...OUTLETS].map((outlet) => (
                    <button
                      key={outlet}
                      type="button"
                      className={`wtChip ${filters.outlet === outlet ? 'active' : ''}`}
                      aria-pressed={filters.outlet === outlet}
                      onClick={() => update({ outlet })}
                    >
                      {outlet === 'all' ? w('all') : outlet}
                    </button>
                  ))}
                </div>
              </fieldset>
            </aside>

            {/* Results */}
            <div className="wtResults">
              <div className="wtToolbar">
                <button type="button" className="wtFilterToggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
                  <SlidersHorizontal aria-hidden="true" />
                  {filtersOpen ? w('hideFilters') : w('showFilters')}
                </button>

                <p className="wtCount" aria-live="polite">
                  {w('results', { count: results.length })}
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
                  <button type="button" aria-pressed={view === 'cards'} className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>
                    <LayoutGrid aria-hidden="true" />
                    <span>{w('cards')}</span>
                  </button>
                  <button type="button" aria-pressed={view === 'table'} className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>
                    <Table2 aria-hidden="true" />
                    <span>{w('table')}</span>
                  </button>
                </div>
              </div>

              {results.length === 0 && (
                <div className="wtEmpty">
                  <h3>{w('noResults')}</h3>
                  <p>{w('noResultsHint')}</p>
                  <div>
                    <button type="button" className="button primary" onClick={() => setFilters(initialFilters)}>
                      <span>{w('reset')}</span>
                    </button>
                    <LocalizedLink to="/contact" className="wtTextLink">
                      {w('contact')}
                      <Arrow />
                    </LocalizedLink>
                  </div>
                </div>
              )}

              {results.length > 0 && view === 'cards' && (
                <ul className="wtCards">
                  {results.map((tank) => (
                    <li key={tank.code} className="wtCard">
                      <LocalizedLink to={modelPath(tank.familyData, tank)} className="wtCardMedia">
                        <img src={tank.image} alt={`${tank.code} – ${num(tank.volume)} L`} loading="lazy" decoding="async" />
                        <span className="wtCardBadges">
                          {badges(tank).map((badge) => (
                            <span key={badge}>{badge}</span>
                          ))}
                        </span>
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

                        <dl className="wtSpecs">
                          <div>
                            <dt>{col('diameter')}</dt>
                            <dd>{tank.diameter}</dd>
                          </div>
                          <div>
                            <dt>{col('height')}</dt>
                            <dd>{tank.height}</dd>
                          </div>
                          {tank.length && (
                            <div>
                              <dt>{col('length')}</dt>
                              <dd>{tank.length}</dd>
                            </div>
                          )}
                          <div>
                            <dt>{col('cap')}</dt>
                            <dd>{tank.cap}</dd>
                          </div>
                          {tank.outlet && (
                            <div>
                              <dt>{col('outlet')}</dt>
                              <dd>{tank.outlet}</dd>
                            </div>
                          )}
                        </dl>

                        <ul className="wtUses">
                          {tank.uses.map((use) => (
                            <li key={use}>{w(`uses.${use}`)}</li>
                          ))}
                        </ul>

                        <div className="wtCardActions">
                          <button type="button" className="wtQuote" onClick={() => openQuote(quoteFor(tank))}>
                            {w('quote')}
                            <Arrow />
                          </button>
                          <span className="wtCardSide">
                            <CompareButton family={tank.familyData} row={tank} compact />
                            <AddToCartButton product={quoteFor(tank)} compact />
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

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
                          <td>{badges(tank).join(' · ')}</td>
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
              <LocalizedLink to="/contact" className="wtTextLink">
                {w('contact')}
                <Arrow />
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
