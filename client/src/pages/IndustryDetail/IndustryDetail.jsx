import { Navigate, useParams } from 'react-router-dom';

/* Old industry detail URLs open the matching section of the industries page. */
export default function IndustryDetail() {
  const { lang, slug } = useParams();

  return <Navigate to={`/${lang}/industries#${slug}`} replace />;
}
