import { useTranslation } from 'react-i18next';
import { FileDown } from 'lucide-react';

import { track } from '../../analytics/track';

/* RMA Plastik 2025 product catalogue (the brochure) as a PDF download. */
export const CATALOG_PDF = '/files/rma-plastik-katalog-2025.pdf';

export default function CatalogLink({ className = 'button ghost', placement, compact = false }) {
  const { t } = useTranslation();

  return (
    <a
      href={CATALOG_PDF}
      className={`catalogLink ${className}`}
      download
      onClick={() => track('file_download', { file_name: 'rma-plastik-katalog-2025.pdf', placement })}
    >
      <span className="catalogLinkText">
        <span>{t('common.catalog')}</span>
        {!compact && <small>{t('common.catalogMeta')}</small>}
      </span>
      <FileDown aria-hidden="true" className="buttonIcon" />
    </a>
  );
}
