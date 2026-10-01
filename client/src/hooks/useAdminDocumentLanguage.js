import { useLayoutEffect } from 'react';

import { applyDocumentLanguage } from '../i18n';

/* The admin panel is English-only; undo any RTL state left by the public site. */
export default function useAdminDocumentLanguage() {
  useLayoutEffect(() => {
    applyDocumentLanguage('en', 'ltr');
  }, []);
}
