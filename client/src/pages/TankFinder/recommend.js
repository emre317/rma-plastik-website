import { waterTanks } from '../../data/productTables';

/*
  Tank finder rules (catalogue data only, no guessing):
  - the model must suit the stored product (family "uses") and the space limits;
  - best match = the smallest model that holds the requested volume
    (models up to 5 % below the request still count, rounding in catalogues);
  - nothing large enough -> the fewest identical tanks that hold the volume together.
*/

export function candidatesFor({ use, orientation, maxHeight, maxDiameter }) {
  return waterTanks.filter(
    (tank) =>
      (!use || tank.uses.includes(use)) &&
      (orientation === 'any' || tank.orientation === orientation) &&
      (!maxHeight || tank.height <= maxHeight) &&
      (!maxDiameter || tank.diameter <= maxDiameter)
  );
}

export function recommend(answers) {
  const volume = Math.max(1, Number(answers.volume) || 0);
  const candidates = candidatesFor(answers);

  const fits = candidates
    .filter((tank) => tank.volume >= volume * 0.95)
    .sort((a, b) => a.volume - b.volume || a.height - b.height);

  const singles = fits.slice(0, 3).map((tank, index) => ({
    tank,
    quantity: 1,
    total: tank.volume,
    best: index === 0,
  }));

  // Several tanks of one model when no single tank is big enough (or as an extra option)
  const combos = candidates
    .filter((tank) => tank.volume < volume * 0.95)
    .map((tank) => {
      const quantity = Math.ceil(volume / tank.volume);
      return { tank, quantity, total: quantity * tank.volume };
    })
    .filter((combo) => combo.quantity <= 10)
    .sort((a, b) => a.quantity - b.quantity || a.total - b.total || a.tank.height - b.tank.height)
    .slice(0, singles.length ? 1 : 3)
    .map((combo, index) => ({ ...combo, best: !singles.length && index === 0, combo: true }));

  // Close but smaller models, so the visitor sees what is just below the request
  const smaller = singles.length
    ? []
    : candidates
        .filter((tank) => tank.volume >= volume * 0.75 && tank.volume < volume * 0.95)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 1)
        .map((tank) => ({ tank, quantity: 1, total: tank.volume, smaller: true }));

  return {
    volume,
    candidates: candidates.length,
    results: [...singles, ...combos, ...smaller],
  };
}

export const USE_OPTIONS = ['water', 'food', 'chemical', 'acid'].filter((use) => waterTanks.some((tank) => tank.uses.includes(use)));

export const VOLUME_PRESETS = [500, 1000, 2000, 3000, 5000, 10000, 15000, 20000, 30000];

export const MAX_VOLUME = Math.max(0, ...waterTanks.map((tank) => tank.volume));
