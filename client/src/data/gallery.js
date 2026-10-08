import content from '@content';

/*
  Field photos (Saha fotoğrafları) uploaded in the admin panel.
  Photo: { image, i18n: { tr|en|ar: { caption, location } } }
*/
const gallery = Array.isArray(content.gallery) ? content.gallery : [];

/* Text in the site language, Turkish when that language is empty */
export function galleryText(photo, field, lang) {
  return photo.i18n?.[lang]?.[field] || photo.i18n?.tr?.[field] || '';
}

export default gallery;
