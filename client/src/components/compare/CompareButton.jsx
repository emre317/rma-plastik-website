import { useTranslation } from 'react-i18next';
import { GitCompareArrows } from 'lucide-react';

import { compareKey, useCompare } from './CompareContext';

/* "Compare" toggle for one model */
export default function CompareButton({ family, row, compact = false }) {
  const { t } = useTranslation();
  const { toggleCompare, isCompared } = useCompare();

  const key = compareKey(family, row);
  const on = isCompared(key);

  return (
    <button
      type="button"
      className={`compareToggle ${on ? 'on' : ''} ${compact ? 'compact' : ''}`}
      aria-pressed={on}
      title={on ? t('compare.remove') : t('compare.add')}
      onClick={() => toggleCompare(key)}
    >
      <GitCompareArrows aria-hidden="true" />
      <span>{on ? t('compare.added') : t('compare.short')}</span>
    </button>
  );
}
