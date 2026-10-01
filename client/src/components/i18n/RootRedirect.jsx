import { Navigate, useLocation } from 'react-router-dom';

import { getPreferredLanguage } from '../../i18n/languages';

export default function RootRedirect() {
  const { search, hash } = useLocation();

  return <Navigate to={`/${getPreferredLanguage()}${search}${hash}`} replace />;
}
