import content from '@content';

/*
  Site features that can be switched on and off in the admin panel
  (Site Ayarları › Ürün fotoğrafları), published with the site.
    productZoom  product photos: magnifier and full-screen view
    product3d    product photos: 3D view
  Both are off by default (the photos are not sharp enough yet); the panel
  setting wins once it has been saved.
*/
const DEFAULTS = { productZoom: false, product3d: false };

const saved = content.settings?.features || {};

const features = Object.fromEntries(
  Object.entries(DEFAULTS).map(([key, value]) => [key, typeof saved[key] === 'boolean' ? saved[key] : value])
);

export default features;
