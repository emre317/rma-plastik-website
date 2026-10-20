/*
  Built-in product tables from the RMA Plastik 2025 brochure (pages 9–19).
  Used until product tables are saved in the admin panel (Ürün tabloları),
  and imported into the database from there. No imports: the server reads
  this file too.

  Volume in litres, sizes in cm, outlets in inches. Volume, diameter/width,
  length, height and cap sizes were updated from the price list of
  02.09.2026 (server/scripts/data/product-dimensions-2026-09.json). Built-in titles/descriptions live in the locale files
  under productTables.families.<id>.

  A table without rows is shown on the site as an "on request" card with a
  quote button (e.g. the underground tanks in the vertical and horizontal
  groups).

  Columns: code, volume, diameter, height, length, width, cap, outlet,
  wheel, conical, reducer, upperLength, bottomLength, upperDiameter,
  bottomDiameter, camber, throat
*/

const IMG = '/images/products';
const ILL = '/images/products/illustrations';

const rows = (columns, list) =>
  list.map((values) => Object.fromEntries(columns.map((column, index) => [column, values[index]])));

const families = [
  // ---------- Polyethylene tanks (p. 9–10)
  {
    id: 'vertical-tanks',
    group: 'vertical',
    image: `${IMG}/rd-15000.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'cap', 'outlet'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'cap', 'outlet'], [
      ['RD 100', 100, 48, 75, '40', '3/4"'],
      ['RD 200', 200, 57, 98, '40', '3/4"'],
      ['RD 300', 300, 70, 90, '40', '3/4"'],
      ['RD 501 HK', 500, 93, 93, '40', null],
      ['RD 750 HK', 750, 99, 118, '40', null],
      ['RD 1000 HK', 1000, 102, 135, '40', null],
      ['RD 1002', 1000, 78, 226, '40', '3/4"'],
      ['RD 1500', 1500, 110, 180, '60', null],
      ['RD 2001', 2000, 132, 155, '60', '3/4"'],
      ['RD 2003', 2000, 164, 112, '40', '3/4"'],
      ['RD 2000 HK', 2000, 140, 160, '40', null],
      ['RD 3000', 3000, 140, 218, '40', '3/4"'],
      ['RD 5001', 5500, 190, 212, '40-60', '2"'],
      ['RD 5002', 5000, 232, 157, '40-60', '2"'],
      ['RD 5003', 4800, 175, 227, '40-60', '2"'],
      ['RD 8000', 8000, 220, 236, '40-60', null],
      ['RD 10000', 10000, 220, 260, '40-60', '2"'],
      ['RD 10002', 10000, 280, 191, '40-60', '2"'],
      ['RD 15000', 15000, 280, 280, '40-60', '2"'],
      ['RD 20000', 20000, 290, 360, '40-60', '2"'],
      ['RD 20001', 20000, 290, 320, '60-60', '2"'],
      ['RD 20002', 20000, 325, 270, '60-60', null],
      ['RD 25000', 25000, 290, 390, '60-60', '2"'],
      ['RD 30000', 30000, 325, 380, '60-60', '2"'],
      ['RD 40000', 37500, 325, 445, '60-60', '2"'],
    ]),
  },
  {
    // No models: shown as an "on request" card with a quote button
    id: 'underground-vertical-tanks',
    group: 'vertical',
    image: `${ILL}/underground.svg`,
    columns: ['code'],
    rows: [],
  },
  {
    id: 'horizontal-tanks',
    group: 'horizontal',
    image: `${IMG}/ry-1000.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'length', 'cap', 'outlet'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'length', 'cap', 'outlet'], [
      ['RY 500', 500, 80, 75, 140, '40', '3/4"'],
      ['RY 1000', 1000, 95, 95, 170, '40', '3/4"'],
      ['RY 2000', 2000, 125, 135, 205, '40', '3/4"'],
      ['RY 3000', 3000, 135, 145, 235, '40', '1"'],
      ['RY 5000', 5000, 170, 185, 240, '40', '1"'],
    ]),
  },
  {
    id: 'horizontal-cylinder-tanks',
    group: 'horizontal',
    image: `${IMG}/ry-2000.webp`,
    columns: ['code', 'volume', 'diameter', 'length', 'height', 'cap'],
    rows: rows(['code', 'volume', 'diameter', 'length', 'height', 'cap'], [
      ['RYS 1000', 1000, 105, 130, null, '40'],
      ['RYR 3000', 3000, 120, 290, 100, null],
      ['RYS 6000', 6000, 200, 295, null, '40'],
      ['RYS 7500', 7500, 200, 300, null, '40'],
      ['RYS 9000', 9000, 200, 360, null, '40'],
      ['RYS 15000', 15000, 230, 400, null, '40'],
    ]),
  },
  {
    // No models: shown as an "on request" card with a quote button
    id: 'underground-horizontal-tanks',
    group: 'horizontal',
    image: `${ILL}/underground.svg`,
    columns: ['code'],
    rows: [],
  },
  {
    id: 'two-layer-vertical',
    group: 'twoLayer',
    image: `${IMG}/sd-set.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'cap'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'cap'], [
      ['ŞD 500', 500, 86, 102, '45'],
      ['ŞD 1000', 1000, 110, 125, '45'],
      ['ŞD 2000', 2000, 140, 160, '45'],
    ]),
  },
  {
    id: 'two-layer-horizontal',
    group: 'twoLayer',
    image: `${IMG}/sy-500.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'length', 'cap'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'length', 'cap'], [
      ['ŞY 500', 500, 74, 73, 135, '45'],
      ['ŞY 1000', 1000, 93, 92, 170, '45'],
    ]),
  },

  // ---------- Textile (p. 11–13)
  {
    id: 'textile-trolleys',
    group: 'textile',
    image: `${IMG}/textile-trolley.webp`,
    columns: ['code', 'volume', 'length', 'width', 'height', 'wheel'],
    rows: rows(['code', 'volume', 'length', 'width', 'height', 'wheel'], [
      ['RTA 24', 230, 71, 51, 66, '100'],
      ['RTA 38', 400, 106, 63, 67, '100'],
      ['RTA 40', 390, 94, 61, 73, '100'],
      ['RTA 45', 340, 82, 67, 65, '125'],
      ['RTA 50', 390, 103, 63, 60, '100'],
      ['RTA 55', 550, 107, 80, 65, '125'],
      ['RTA 60', 480, 108, 71, 81, '100'],
      ['RTA 64', 300, 65, 65, 74, '100'],
      ['RTA 66', 750, 101, 101, 81, '125'],
      ['RTA 70', 270, 73, 52, 71, '100'],
      ['RTA 75', 300, 75, 64, 63, '125'],
      ['RTA 80', 500, 105, 60, 82, '125'],
      ['RTA 100', 550, 105, 75, 83, '125-100'],
      ['RTA 0110', 650, 110, 72, 84, '100'],
      ['RTA 110', 620, 121, 82, 65, '125'],
      ['RTA 111', 690, 114, 70, 67, '125'],
      ['RTA 116', 640, 117, 75, 72, '125'],
      ['RTA 120', 1350, 153, 110, 81, '150'],
      ['RTA 125', 1450, 126, 126, 94, '125'],
      ['RTA 130', 850, 120, 90, 80, '150'],
      ['RTA 140', 720, 140, 80, 65, '125-150'],
      ['RTA 150', 800, 162, 100, 48, '125'],
      ['RTA 160', 1440, 200, 90, 80, '125'],
      ['RTA 200', 1600, 204, 100, 80, '150-200'],
      ['RTA 220', 1760, 222, 102, 80, '150'],
      ['RTA 240', 1900, 240, 98, 78, '150-200'],
      ['RTA 260', 2080, 260, 100, 80, '150'],
      ['RTA 270-Y', 2150, 252, 98, 79, '150'],
      ['RTA 270-B', 3500, 272, 114, 116, '150'],
      ['RTA 320', 2600, 325, 103, 80, '150'],
      ['RTA 244', null, 160, 100, 60, null],
      ['RTA 344', null, 120, 100, 155, null],
    ]),
  },
  {
    id: 'cylinder-trolleys',
    group: 'textile',
    image: `${IMG}/cylinder-trolley.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'wheel'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'wheel'], [
      ['RTS 90', 640, 100, 82, '125'],
      ['RTS 125', 720, 120, 64, '125'],
      ['RTS 130', 980, 124, 79, '150'],
      ['RTS 135', 1200, 141, 77, '150'],
      ['RTS 140', 1320, 145, 80, '150-200'],
      ['RTS 160', 1400, 165, 75, '150'],
    ]),
  },
  {
    id: 'stackable-rectangular',
    group: 'textile',
    image: `${IMG}/stackable-trolley.webp`,
    columns: ['code', 'volume', 'upperLength', 'bottomLength', 'height'],
    rows: rows(['code', 'volume', 'upperLength', 'bottomLength', 'height'], [
      ['RKS 110', 750, '110', 96, 90],
      ['RKS 145', 1200, '137', 124, 90],
      ['RKT 150', 1890, '210-200', 100, 90],
    ]),
  },
  {
    id: 'stackable-cylinder',
    group: 'textile',
    image: `${IMG}/stackable-trolley.webp`,
    columns: ['code', 'volume', 'upperDiameter', 'bottomDiameter', 'height'],
    rows: rows(['code', 'volume', 'upperDiameter', 'bottomDiameter', 'height'], [
      ['RKS 110', 750, 110, 96, 90],
      ['RKS 135', 910, 135, null, 90],
      ['RKS 145', 1200, 137, 124, 90],
    ]),
  },
  {
    id: 'cop-boxes',
    group: 'copBoxes',
    image: `${IMG}/cop-box.webp`,
    columns: ['code', 'volume', 'length', 'width', 'height'],
    rows: rows(['code', 'volume', 'length', 'width', 'height'], [
      ['RTK 40', 60, 42, 34, 51],
      ['RTK 44', 106, 49, 45, 62],
      ['RTK 50', 70, 59, 35, 38],
      ['RTK 51', 80, 50, 42, 40],
      ['RTK 55', 90, 57, 36, 41],
      ['RTK 58', 93, 62, 36, 42],
      ['RTK 72', 110, 75, 33, 43],
      ['RTK 75', 115, 78, 35, 44],
      ['RTK 80', 110, 63, 48, 45],
      ['RTK 83', 100, 60, 42, 46],
      ['RTK 93', 95, 63, 40, 47],
      ['RTK 98', 105, 67, 32, 48],
      ['RTK 120', 285, 113, 77, 49],
      ['RTK 140', 340, 122, 86, 50],
    ]),
  },
  {
    id: 'yarn-boxes',
    group: 'copBoxes',
    image: `${IMG}/yarn-box.webp`,
    columns: ['code', 'length', 'width', 'height'],
    rows: rows(['code', 'length', 'width', 'height'], [
      ['RTLF 75', 45, 40, '67/87'],
      ['RTLF 95', 74, 47, '59/75'],
    ]),
  },
  {
    id: 'rope-dyeing-cans',
    group: 'ropeCans',
    image: `${IMG}/rope-dyeing-can.webp`,
    columns: ['code', 'diameter', 'height'],
    rows: rows(['code', 'diameter', 'height'], [
      ['RTHB 175', 155, 175],
      ['RTHB 200', 140, 200],
    ]),
  },

  // ---------- Chemical (p. 14–15, 17)
  {
    id: 'silo-tanks',
    group: 'silo',
    image: `${IMG}/silo-tank.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'conical', 'cap'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'conical', 'cap'], [
      ['RS 500', 500, 80, 155, 25, '40'],
      ['RS 1000', 1000, 105, 165, 30, '40'],
      ['RS 1300', 1500, 109, 210, 36, '40'],
      ['RS 1500', 1500, 100, 185, 35, '40'],
      ['RS 2000', 2000, 135, 195, 30, '40'],
      ['RS 3000', 3000, 160, 195, 60, '40'],
      ['RS 5000', 5000, 170, 265, 40, '40-60'],
      ['RS 10000', 10000, 220, 325, 44, '40-60'],
      ['RS 10001', 10000, 220, 380, 180, '40-60'],
      ['RS 15000', 17000, 260, 380, 40, '40-60'],
      ['RS 24000', 24000, 290, 450, 110, '60-60'],
    ]),
  },
  {
    id: 'mixer-silo-tanks',
    group: 'silo',
    image: `${IMG}/mixer-silo-tank.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'conical', 'cap', 'reducer'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'conical', 'cap', 'reducer'], [
      ['RS 500', 500, 80, 155, 25, '40', '0,75 kW'],
      ['RS 1000', 1000, 105, 165, 30, '40', '1,1 kW'],
      ['RS 1300', 1500, 109, 210, 36, '40', '1,1-1,5 kW'],
      ['RS 1500', 1500, 100, 185, 35, '40', '1,1-1,5 kW'],
      ['RS 2000', 2000, 135, 195, 30, '40', '1,5 kW'],
      ['RS 3000', 3000, 160, 195, 60, '40', '2,2 kW'],
      ['RS 5000', 5000, 170, 265, 40, '40-60', '4 kW'],
      ['RS 10000', 10000, 220, 325, 44, '40-60', '7,5 kW'],
      ['RS 15000', 17000, 260, 380, 40, '40-60', '11 kW'],
      ['RS 24000', 24000, 290, 450, 110, '60-60', '15 kW'],
    ]),
  },
  {
    id: 'metal-stand-silo-tanks',
    group: 'silo',
    image: `${IMG}/silo-tank.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'cap'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'cap'], [
      ['RSM 500', 500, 80, 155, '40'],
      ['RSM 1000', 1000, 105, 165, '40'],
      ['RSM 1300', 1500, 109, 210, '40'],
      ['RSM 1500', 1500, 100, 185, '40'],
      ['RSM 2000', 2000, 135, 195, '40'],
      ['RSM 3000', 3000, 160, 195, '40'],
      ['RSM 5000', 5000, 170, 265, '40-60'],
      ['RSM 10000', 10000, 220, 325, '40-60'],
      ['RSM 10001', 10000, 220, 380, '40-60'],
      ['RSM 15000', 17000, 260, 380, '40-60'],
      ['RSM 24000', 24000, 290, 450, '60-60'],
    ]),
  },
  {
    id: 'salt-tanks',
    group: 'treatment',
    image: `${IMG}/salt-tank.webp`,
    columns: ['code', 'volume', 'width', 'height'],
    rows: rows(['code', 'volume', 'width', 'height'], [
      ['TUZ 100', 100, '41', 104],
      ['TUZ 200', 200, '51', 123],
      ['TUZ 300', 300, '61', 121],
      ['TUZ 500', 500, '80', 111],
      ['TUZ 1000', 1000, '98', 133],
    ]),
  },
  {
    id: 'chlor-tanks',
    group: 'treatment',
    image: `${IMG}/chlor-tank.webp`,
    columns: ['code', 'volume', 'width', 'height'],
    rows: rows(['code', 'volume', 'width', 'height'], [
      ['RDK 55', 55, '35 x 35', 44],
      ['RDK 100', 100, '40', 90],
      ['RDK 200', 200, '47', 105],
      ['RDK 300', 300, '63', 99],
      ['RDK 500', 500, '65', 106],
    ]),
  },

  // ---------- Food (p. 16, 18)
  {
    id: 'brine-tanks',
    group: 'food',
    image: `${IMG}/pickle-tank.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'outlet'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'outlet'], [
      ['RDS 700', 700, 101, 115, '2"'],
      ['RDS 1000', 1000, 135, 90, '2"'],
      ['RDS 1500', 1700, 125, 125, '2"'],
      ['RDS 2000', 2250, 135, 160, '2"'],
      ['RDS 2500', 2500, 150, 135, '2"'],
      ['RDS 3000', 3000, 160, 175, '2"'],
      ['RDS 3800', 3800, 165, 185, '2"'],
      ['RDS 4500', 4500, 195, 165, '2"'],
      ['RDS 7000', 7000, 220, 190, '2"'],
      ['RDS 10000', 10000, 220, 270, '2"'],
      ['RDS 15000', 15000, 290, 270, '2"'],
      ['RDSM 3800', 3800, 165, 185, null],
      ['RDSM 15000', 15000, 290, 270, null],
      ['RDSMR 3800', 3800, 165, 185, null],
      ['RDSMR 4500', 4500, 195, 165, null],
      ['RDSMR 7000', 7000, 220, 190, null],
    ]),
  },
  {
    id: 'pickle-tanks',
    group: 'food',
    image: `${IMG}/pickle-tank.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'camber', 'throat', 'outlet', 'cap'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'camber', 'throat', 'outlet', 'cap'], [
      ['RDT 1500', 1500, 130, 180, 28, 27, '2"', '81'],
      ['RDT 2500', 2500, 150, 215, 18, 20, '2"', '81'],
      ['RDT 5000', 5000, 190, 230, 18, 15, '2"', '104'],
      ['RDT 10001', 10000, 220, 325, 40, 25, '2"', '116'],
    ]),
  },
  {
    id: 'turnip-tanks',
    group: 'food',
    image: `${IMG}/rd-3000.webp`,
    columns: ['code', 'volume', 'diameter', 'height', 'cap'],
    rows: rows(['code', 'volume', 'diameter', 'height', 'cap'], [
      ['RD 701', 700, 97, 109, '60'],
      ['RD 1001', 1000, 97, 133, '60'],
      ['RD 2001', 2000, 132, 155, '60'],
      ['RD 3301', 3300, 147, 200, '60'],
      ['RD 10005', 10000, 220, 270, '60'],
    ]),
  },
  {
    id: 'confit-pools',
    group: 'confit',
    image: null,
    columns: ['code', 'volume', 'width', 'height', 'length'],
    rows: rows(['code', 'volume', 'width', 'height', 'length'], [
      ['RH 320', 4650, '120', 120, 305],
      ['RH 350', 5250, '103', 146, 366],
      ['RH 400', 2800, '70', 100, 400],
      ['RKH 9000', 9000, '185', 200, 283],
      ['RKH 15000', 15000, '201', 203, 403],
    ]),
  },

  // ---------- Other (p. 17–19)
  {
    id: 'rectangular-tanks',
    group: 'fuel',
    image: null,
    columns: ['code', 'volume', 'width', 'height', 'length', 'cap'],
    rows: rows(['code', 'volume', 'width', 'height', 'length', 'cap'], [
      ['Kare 100', 100, '45', 42, 78, '25'],
      ['Kare 200', 200, '66', 42, 88, '25'],
      ['Kare 300', 300, '82', 33, 122, '25'],
      ['Kare 500', 500, '98', 39, 138, '25'],
    ]),
  },
  {
    id: 'adblue-tanks',
    group: 'fuel',
    image: `${IMG}/adblue-tank.webp`,
    columns: ['code', 'volume', 'diameter', 'height'],
    rows: rows(['code', 'volume', 'diameter', 'height'], [
      ['AdBlue 1000', 1000, 155, 188],
      ['AdBlue 2500', 2500, 155, 188],
      ['AdBlue 5000', 5000, 220, 240],
    ]),
  },
  {
    id: 'road-barriers',
    group: 'barriers',
    image: `${IMG}/road-barrier.webp`,
    columns: ['code', 'length', 'width', 'height'],
    rows: rows(['code', 'length', 'width', 'height'], [
      ['RYB 1000', '116', '20 x 50', 77],
      ['RYB 1001', '159', '12 x 45', 50],
      ['SYB 120', '130 x 120', '38 x 20', 80],
      ['SYB 180', '160 x 180', '38 x 20', 85],
    ]),
  },
  {
    id: 'trash-bins',
    group: 'bins',
    image: `${ILL}/bins.svg`,
    columns: ['code', 'volume', 'height'],
    rows: rows(['code', 'volume', 'height'], [
      ['RÇK 80', 80, 67.5],
      ['RÇK 90', 90, 70],
    ]),
  },
  {
    id: 'pallets',
    group: 'pallets',
    image: `${ILL}/pallets.svg`,
    columns: ['code', 'length', 'width', 'height'],
    rows: rows(['code', 'length', 'width', 'height'], [
      ['RP 70*100', 73, 103, 15],
      ['RP 80*120', 120, 80, 15],
      ['RP 90*100', 100, 90, 15],
      ['RP 100*100', 100, 100, 15],
      ['RP 100*120', 120, 100, 15],
      ['RP 105*105', 106, 106, 15],
      ['RP 120*120', 120, 120, 15],
    ]),
  },
];

// Categories of the first admin version; tables saved then still carry them
export const LEGACY_GROUPS = ['tanks', 'textile', 'chemical', 'food', 'other'];

export const COLUMN_KEYS = [
  'volume', 'diameter', 'height', 'length', 'width', 'cap', 'outlet', 'wheel', 'conical',
  'reducer', 'upperLength', 'bottomLength', 'upperDiameter', 'bottomDiameter', 'camber', 'throat', 'weight',
];

export const WATER_USES = ['water', 'food', 'chemical', 'acid'];

/* ---------- Water tank selector settings and photos ---------- */

// Closest brochure photo for a vertical tank of this volume
const verticalImage = (volume) => {
  const shots = [200, 3000, 5000, 10000, 15000, 20000, 30000, 40000];
  const best = shots.reduce((a, b) => (Math.abs(b - volume) < Math.abs(a - volume) ? b : a));
  return `${IMG}/rd-${best}.webp`;
};

const horizontalImage = (volume) => `${IMG}/ry-${volume <= 700 ? 500 : volume <= 1500 ? 1000 : 2000}.webp`;

const WATER = {
  'vertical-tanks': { orientation: 'vertical', layer: 'single', uses: ['water', 'food', 'chemical', 'acid'], image: verticalImage },
  'horizontal-tanks': { orientation: 'horizontal', layer: 'single', uses: ['water', 'food'], image: horizontalImage },
  'two-layer-vertical': { orientation: 'vertical', layer: 'double', uses: ['water'] },
  'two-layer-horizontal': { orientation: 'horizontal', layer: 'double', uses: ['water'] },
};

families.forEach((family) => {
  const water = WATER[family.id];

  family.waterTank = water ? { orientation: water.orientation, layer: water.layer, uses: water.uses } : null;

  if (water?.image) {
    family.rows.forEach((row) => {
      row.image = water.image(row.volume);
    });
  }
});

export default families;
