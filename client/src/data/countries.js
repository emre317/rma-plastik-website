/*
  ISO 3166-1 alpha-2 country codes. Names come from the browser
  (Intl.DisplayNames) in the site language, so no translations are kept here.
*/
export const COUNTRY_CODES = (
  'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'
).split(' ');

/* [{ code, name }] sorted by name in `lang`, Türkiye first */
export function countryOptions(lang) {
  let names = null;

  try {
    names = new Intl.DisplayNames([lang], { type: 'region' });
  } catch {
    // Older browsers: codes are shown instead of names
  }

  const collator = new Intl.Collator(lang);
  const list = COUNTRY_CODES.map((code) => ({ code, name: names?.of(code) || code }))
    .sort((a, b) => collator.compare(a.name, b.name));

  const turkey = list.findIndex((item) => item.code === 'TR');
  return turkey > 0 ? [list[turkey], ...list.slice(0, turkey), ...list.slice(turkey + 1)] : list;
}

/* Turkish name, sent with the request so the sales team reads one language */
export function countryNameTr(code) {
  try {
    return new Intl.DisplayNames(['tr'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}
