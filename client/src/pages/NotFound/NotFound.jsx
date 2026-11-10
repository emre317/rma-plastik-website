import { Navigate, useParams } from 'react-router-dom';

import { isSupportedLanguage } from '../../i18n/languages';

/*
  An address that does not exist inside the app (e.g. a removed blog post or
  product model): straight to the home page of the language, like the
  server does for unknown addresses (public/.htaccess). No "not found" page.
*/
export default function NotFound() {
  const { lang } = useParams();
  return <Navigate to={`/${isSupportedLanguage(lang) ? lang : 'tr'}`} replace />;
}
