import { Navigate, useParams } from 'react-router-dom';

import products from '../../data/products';

/*
  The early generic product pages (/products/<slug>) were replaced by the
  brochure product groups. Old links open the matching page instead.
*/
const TARGETS = {
  'industrial-tanks': '/product-tables',
  'chemical-tanks': '/product-tables#silo-tanks',
  'water-tanks': '/water-tanks',
  agriculture: '/products',
  custom: '/custom-molding',
};

export default function ProductDetail() {
  const { lang, slug } = useParams();
  const product = products.find((item) => item.slug === slug);

  return <Navigate to={`/${lang}${TARGETS[product?.category] || '/products'}`} replace />;
}
