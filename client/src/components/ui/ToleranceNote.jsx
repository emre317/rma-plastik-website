import { useTranslation } from 'react-i18next';
import { Ruler } from 'lucide-react';

/*
  "Ölçüler ±%5 toleranslıdır…" under every list of product dimensions
  (model page, product tables, water tanks, compare, tank finder, datasheet).
  The text is common.tolerance (editable in Sayfa Metinleri).
*/
export default function ToleranceNote({ className = '' }) {
  const { t } = useTranslation();
  return (
    <p className={`toleranceNote ${className}`}>
      <Ruler aria-hidden="true" />
      <span>{t('common.tolerance')}</span>
    </p>
  );
}
