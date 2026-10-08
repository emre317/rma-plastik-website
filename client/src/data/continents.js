/*
  Continent of every country (ISO 3166-1 alpha-2), used to count the
  continents reached by the export markets ("4 Kıta"). Transcontinental
  countries are listed where they are usually counted: Türkiye and the
  Caucasus in Asia, Russia and Cyprus in Europe, Egypt in Africa.
*/
const LISTS = {
  europe: 'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK',
  asia: 'AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE',
  africa: 'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW',
  northAmerica: 'AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI',
  southAmerica: 'AR BO BR CL CO EC FK GF GY PE PY SR UY VE',
  oceania: 'AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV VU WF WS',
};

const CONTINENT_OF = Object.fromEntries(
  Object.entries(LISTS).flatMap(([continent, codes]) => codes.split(' ').map((code) => [code, continent]))
);

export const continentOf = (code) => CONTINENT_OF[String(code || '').toUpperCase()] || null;

/* Number of different continents among the given country codes */
export const countContinents = (codes) => new Set(codes.map(continentOf).filter(Boolean)).size;
