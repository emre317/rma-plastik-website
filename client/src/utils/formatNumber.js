/* 37500 -> "37.500" (tr) / "37,500" (en, ar); text values are returned as they are */
export default function formatNumber(value, lang = 'tr') {
  if (typeof value !== 'number') {
    return value ?? '–';
  }

  return value.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US');
}
