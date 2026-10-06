import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { GitCompareArrows, X } from 'lucide-react';

import { LocalizedLink } from '../i18n/LocalizedLink';
import Arrow from '../i18n/Arrow';
import { MAX_COMPARE, resolveCompareKeys, useCompare } from './CompareContext';

/* Bottom bar with the picked models and the "Compare" button */
export default function CompareTray() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { keys, toggleCompare, clearCompare, notice } = useCompare();

  const items = resolveCompareKeys(keys);
  const visible = items.length > 0 && !pathname.endsWith('/compare');

  // Lets other floating buttons (quote cart) move up while the bar is shown
  useEffect(() => {
    document.body.classList.toggle('hasCompareTray', visible);
    return () => document.body.classList.remove('hasCompareTray');
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="compareTray" role="region" aria-label={t('compare.title')}>
      <span className="compareTrayLabel">
        <GitCompareArrows aria-hidden="true" />
        {t('compare.trayLabel', { count: items.length, max: MAX_COMPARE })}
      </span>

      <ul>
        {items.map(({ key, family, row }) => (
          <li key={key}>
            <span className="compareTrayImage">
              {(row.image || family.image) && <img src={row.image || family.image} alt="" />}
            </span>
            <span>{row.code}</span>
            <button type="button" onClick={() => toggleCompare(key)} aria-label={`${row.code} – ${t('compare.remove')}`}>
              <X aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {notice === 'full' && <span className="compareTrayNotice">{t('compare.full', { max: MAX_COMPARE })}</span>}

      <div className="compareTrayActions">
        <button type="button" className="compareTrayClear" onClick={clearCompare}>{t('compare.clear')}</button>
        <LocalizedLink
          to={`/compare?models=${encodeURIComponent(keys.join(','))}`}
          className={`button primary ${items.length < 2 ? 'disabled' : ''}`}
          aria-disabled={items.length < 2}
          onClick={(event) => items.length < 2 && event.preventDefault()}
        >
          <span>{items.length < 2 ? t('compare.pickMore') : t('compare.go')}</span>
          <Arrow className="buttonArrow" />
        </LocalizedLink>
      </div>
    </div>
  );
}
