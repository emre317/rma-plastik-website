import { useLayoutEffect } from 'react';

import { applyDocumentLanguage } from '../i18n';

/*
  The admin panel is in Turkish: lang="tr" so capitals are written correctly
  (YÖNETİCİ, not YÖNETICI); also undoes any RTL state left by the public site.
*/
export default function useAdminDocumentLanguage() {
  useLayoutEffect(() => {
    applyDocumentLanguage('tr', 'ltr');
  }, []);
}
