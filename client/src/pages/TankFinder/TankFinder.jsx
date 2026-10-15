import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Beaker, Check, Droplets, FlaskConical, GitCompareArrows, Info, MoveHorizontal,
  MoveVertical, RotateCcw, Shuffle, UtensilsCrossed, Wand2,
} from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import Arrow from '../../components/i18n/Arrow';
import { useQuote } from '../../components/quote/QuoteContext';
import CompareButton from '../../components/compare/CompareButton';
import { compareKey, useCompare } from '../../components/compare/CompareContext';
import useLanguage from '../../hooks/useLanguage';
import useModelQuote from '../../hooks/useModelQuote';
import formatNumber from '../../utils/formatNumber';
import { familyText, modelPath } from '../../data/productTables';
import { MAX_VOLUME, USE_OPTIONS, VOLUME_PRESETS, candidatesFor, recommend } from './recommend';

const USE_ICONS = { water: Droplets, food: UtensilsCrossed, chemical: FlaskConical, acid: Beaker };
const ORIENTATIONS = [
  { id: 'any', icon: Shuffle },
  { id: 'vertical', icon: MoveVertical },
  { id: 'horizontal', icon: MoveHorizontal },
];

const STEPS = ['use', 'volume', 'space', 'result'];

const initial = { use: '', volume: '', orientation: 'any', maxHeight: '', maxDiameter: '' };

/* "Find the right tank" wizard: 3 questions -> best matching catalogue models */
export default function TankFinder() {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();
  const navigate = useNavigate();
  const { openQuote, addToCart, inCart } = useQuote();
  const { setCompare } = useCompare();
  const quoteFor = useModelQuote();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(initial);

  const f = (key, options) => t(`finder.${key}`, options);
  const num = (value) => formatNumber(value, lang);
  const set = (patch) => setAnswers((current) => ({ ...current, ...patch }));

  const volumeValue = Number(answers.volume) || 0;
  const canNext = step === 0 ? Boolean(answers.use) : step === 1 ? volumeValue > 0 : true;

  const outcome = useMemo(
    () =>
      recommend({
        ...answers,
        maxHeight: Number(answers.maxHeight) || 0,
        maxDiameter: Number(answers.maxDiameter) || 0,
      }),
    [answers]
  );

  // Live hint on the space step: how many models still fit
  const remaining = candidatesFor({
    use: answers.use,
    orientation: answers.orientation,
    maxHeight: Number(answers.maxHeight) || 0,
    maxDiameter: Number(answers.maxDiameter) || 0,
  }).length;

  const go = (next) => {
    setStep(next);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  const restart = () => {
    setAnswers(initial);
    go(0);
  };

  const compareAll = () => {
    setCompare(outcome.results.map(({ tank }) => compareKey(tank.familyData, tank)));
    navigate(`/${lang}/compare`);
  };

  const summary = [
    answers.use && { step: 0, text: f(`uses.${answers.use}`) },
    volumeValue > 0 && { step: 1, text: `${num(volumeValue)} L` },
    { step: 2, text: f(`orientations.${answers.orientation}`) },
    Number(answers.maxHeight) > 0 && { step: 2, text: `${f('heightShort')} ≤ ${answers.maxHeight} cm` },
    Number(answers.maxDiameter) > 0 && { step: 2, text: `${f('diameterShort')} ≤ ${answers.maxDiameter} cm` },
  ].filter(Boolean);

  return (
    <main className="internalPage finderPage">
      <Seo
        title={t('meta.titles.tankFinder')}
        description={t('meta.descriptions.tankFinder')}
        breadcrumbs={[
          { name: t('meta.titles.waterTanks'), path: '/water-tanks' },
          { name: t('meta.titles.tankFinder'), path: '/tank-finder' },
        ]}
      />

      <PageHeader
        compact
        crumbs={[
          { label: t('nav.waterTanks'), to: '/water-tanks' },
          { label: t('meta.titles.tankFinder') },
        ]}
        eyebrow={f('eyebrow')}
        icon={Wand2}
        title={f('title')}
        accent={f('titleAccent')}
        lead={f('intro')}
      />

      <section className="finderBody">
        <div className="container finderLayout">

          <ol className="finderSteps" aria-label={f('progress')}>
            {STEPS.map((id, index) => (
              <li key={id} className={index === step ? 'active' : index < step ? 'done' : ''}>
                <button type="button" onClick={() => index < step && go(index)} disabled={index > step} aria-current={index === step ? 'step' : undefined}>
                  <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span>
                  {f(`steps.${id}`)}
                </button>
              </li>
            ))}
          </ol>

          <div className="finderPanel" key={step}>

            {step === 0 && (
              <>
                <h2>{f('questions.use')}</h2>
                <div className="finderOptions">
                  {USE_OPTIONS.map((use) => {
                    const Icon = USE_ICONS[use];
                    return (
                      <button
                        key={use}
                        type="button"
                        className={`finderOption ${answers.use === use ? 'active' : ''}`}
                        aria-pressed={answers.use === use}
                        onClick={() => {
                          set({ use });
                          go(1);
                        }}
                      >
                        <span className="finderOptionIcon" aria-hidden="true"><Icon /></span>
                        <strong>{f(`uses.${use}`)}</strong>
                        <small>{f(`useHints.${use}`)}</small>
                      </button>
                    );
                  })}
                </div>
                <p className="finderNote">
                  <Info aria-hidden="true" />
                  {f('chemicalNote')}{' '}
                  <LocalizedLink to="/product-tables#silo-tanks">{t('meta.titles.productTables')}</LocalizedLink>
                </p>
              </>
            )}

            {step === 1 && (
              <>
                <h2>{f('questions.volume')}</h2>
                <label className="finderVolume">
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={answers.volume}
                    placeholder="5000"
                    onChange={(event) => set({ volume: event.target.value })}
                    onKeyDown={(event) => event.key === 'Enter' && canNext && go(2)}
                    autoFocus
                  />
                  <span>{f('litres')}</span>
                </label>
                <div className="wtChips finderPresets">
                  {VOLUME_PRESETS.filter((value) => value <= MAX_VOLUME * 1.5).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`wtChip ${volumeValue === value ? 'active' : ''}`}
                      onClick={() => set({ volume: String(value) })}
                    >
                      {num(value)} L
                    </button>
                  ))}
                </div>
                <p className="finderNote">
                  <Info aria-hidden="true" />
                  {f('volumeNote', { max: num(MAX_VOLUME) })}
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <h2>{f('questions.space')}</h2>
                <div className="finderOptions three">
                  {ORIENTATIONS.map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      className={`finderOption ${answers.orientation === id ? 'active' : ''}`}
                      aria-pressed={answers.orientation === id}
                      onClick={() => set({ orientation: id })}
                    >
                      <span className="finderOptionIcon" aria-hidden="true"><Icon /></span>
                      <strong>{f(`orientations.${id}`)}</strong>
                      <small>{f(`orientationHints.${id}`)}</small>
                    </button>
                  ))}
                </div>

                <div className="finderLimits">
                  <label>
                    <span>{f('maxHeight')}</span>
                    <span className="finderLimitField">
                      <input type="number" min="1" value={answers.maxHeight} placeholder={f('noLimit')} onChange={(event) => set({ maxHeight: event.target.value })} />
                      <em>cm</em>
                    </span>
                  </label>
                  <label>
                    <span>{f('maxDiameter')}</span>
                    <span className="finderLimitField">
                      <input type="number" min="1" value={answers.maxDiameter} placeholder={f('noLimit')} onChange={(event) => set({ maxDiameter: event.target.value })} />
                      <em>cm</em>
                    </span>
                  </label>
                </div>

                <p className={`finderNote ${remaining === 0 ? 'warn' : ''}`}>
                  <Info aria-hidden="true" />
                  {remaining === 0 ? f('noneFit') : f('remaining', { count: remaining })}
                </p>
              </>
            )}

            {step === 3 && (
              <>
                <div className="finderSummary">
                  {summary.map((item) => (
                    <button key={item.text} type="button" onClick={() => go(item.step)} title={f('edit')}>
                      {item.text}
                    </button>
                  ))}
                  <button type="button" className="finderRestart" onClick={restart}>
                    <RotateCcw aria-hidden="true" />
                    {f('restart')}
                  </button>
                </div>

                {outcome.results.length === 0 ? (
                  <div className="wtEmpty">
                    <h3>{f('noResults')}</h3>
                    <p>{f('noResultsText')}</p>
                    <div>
                      <button type="button" className="button primary" onClick={() => go(2)}>
                        <span>{f('changeSpace')}</span>
                      </button>
                      <LocalizedLink to="/custom-molding" className="wtTextLink">
                        {t('productModel.customSize')}
                        <Arrow />
                      </LocalizedLink>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2>{f('resultsTitle')}</h2>

                    <ul className="finderResults">
                      {outcome.results.map(({ tank, quantity, total, best, combo, smaller }) => {
                        const family = tank.familyData;
                        const product = quoteFor(family, tank);
                        const over = Math.round(((total - outcome.volume) / outcome.volume) * 100);

                        return (
                          <li key={`${tank.family}-${tank.slug}-${quantity}`} className={`finderResult ${best ? 'best' : ''}`}>
                            {best && <span className="finderBadge">{f('best')}</span>}

                            <LocalizedLink to={modelPath(family, tank)} className="finderResultImage">
                              <img src={tank.image} alt={`${tank.code} – ${num(tank.volume)} L`} loading="lazy" />
                              {quantity > 1 && <span className="finderQty">× {quantity}</span>}
                            </LocalizedLink>

                            <div className="finderResultBody">
                              <span className="finderResultFamily">{familyText(family, 'title', lang, t)}</span>
                              <h3>
                                <LocalizedLink to={modelPath(family, tank)}>
                                  {quantity > 1 ? `${quantity} × ${tank.code}` : tank.code}
                                </LocalizedLink>
                              </h3>
                              <strong className="finderResultVolume">
                                {num(total)} L
                                {quantity > 1 && <small> ({quantity} × {num(tank.volume)} L)</small>}
                              </strong>

                              <ul className="finderReasons">
                                {combo && <li>{f('reasons.combo', { count: quantity })}</li>}
                                {smaller && <li className="warn">{f('reasons.smaller', { percent: Math.abs(over) })}</li>}
                                {!combo && !smaller && (over <= 0 ? <li>{f('reasons.exact')}</li> : <li>{f('reasons.over', { percent: over })}</li>)}
                                {Number(answers.maxHeight) > 0 && <li>{f('reasons.height', { value: tank.height })}</li>}
                                {Number(answers.maxDiameter) > 0 && <li>{f('reasons.diameter', { value: tank.diameter })}</li>}
                              </ul>

                              <dl className="wtSpecs">
                                <div>
                                  <dt>{t('productTables.columns.diameter')}</dt>
                                  <dd>{tank.diameter}</dd>
                                </div>
                                <div>
                                  <dt>{t('productTables.columns.height')}</dt>
                                  <dd>{tank.height}</dd>
                                </div>
                              </dl>

                              <div className="finderResultActions">
                                <button
                                  type="button"
                                  className="button primary quoteButton"
                                  onClick={() => openQuote(product, { quantity })}
                                >
                                  <span>{t('productModel.quote')}</span>
                                  <Arrow className="buttonArrow" />
                                </button>
                                <button
                                  type="button"
                                  className={`addToCart compact ${inCart(product.name) ? 'added' : ''}`}
                                  onClick={() => addToCart(product, quantity)}
                                  disabled={inCart(product.name)}
                                >
                                  {inCart(product.name) ? <Check aria-hidden="true" /> : null}
                                  <span>{inCart(product.name) ? t('quoteCart.added') : t('quoteCart.addShort')}</span>
                                </button>
                                <CompareButton family={family} row={tank} compact />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {outcome.results.length > 1 && (
                      <button type="button" className="compareToggle finderCompareAll" onClick={compareAll}>
                        <GitCompareArrows aria-hidden="true" />
                        <span>{f('compareAll')}</span>
                      </button>
                    )}

                    <p className="finderNote">
                      <Info aria-hidden="true" />
                      {f('disclaimer')}
                    </p>
                  </>
                )}
              </>
            )}

            {step < 3 && (
              <div className="finderNav">
                {step > 0 ? (
                  <button type="button" className="wtTextLink finderBack" onClick={() => go(step - 1)}>
                    <Arrow direction="left" />
                    {f('back')}
                  </button>
                ) : <span />}
                <button type="button" className="button primary" disabled={!canNext} onClick={() => go(step + 1)}>
                  <span>{step === 2 ? f('show') : f('next')}</span>
                  <Arrow direction="right" className="buttonArrow" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
