import { Navigate, useParams } from 'react-router-dom';

/*
  The early generic product pages (/products/<slug>) were replaced by the
  brochure product groups. Old links open the matching page instead.
*/
const TARGETS = {
  'industrial-storage-tank': '/product-tables',
  'chemical-storage-tank': '/product-tables#silo-tanks',
  'water-storage-tank': '/water-tanks',
  'agricultural-tank': '/products',
  'custom-engineered-product': '/custom-molding',
};

export default function ProductDetail() {
  const { lang, slug } = useParams();

  return <Navigate to={`/${lang}${TARGETS[slug] || '/products'}`} replace />;
}
