import { Navigate, useParams } from 'react-router-dom';

import { LEGACY_INDUSTRIES } from '../../data/industries';

/* Old industry detail URLs open the matching section of the industries page
   (sectors of the earlier list go to the sector that now covers them). */
export default function IndustryDetail() {
  const { lang, slug } = useParams();
  const target = slug in LEGACY_INDUSTRIES ? LEGACY_INDUSTRIES[slug] : slug;

  return <Navigate to={`/${lang}/industries${target ? `#${target}` : ''}`} replace />;
}
