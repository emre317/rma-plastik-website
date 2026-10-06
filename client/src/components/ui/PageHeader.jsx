import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';

import { LocalizedLink } from '../i18n/LocalizedLink';

/*
  Shared header of the inner pages: breadcrumb, eyebrow, title, lead,
  actions and a facts strip, with an optional product visual on the side.

  crumbs: [{ label, to? }] after "Ana Sayfa" (the last one is the current page)
  facts:  [{ value, label }]
  media:  [{ src }] – one to three product photos (mediaTone 'glass' for round cut-outs)
*/
export default function PageHeader({
  crumbs = [],
  eyebrow,
  icon: Icon,
  title,
  accent,
  lead,
  actions,
  facts,
  media,
  mediaTone = 'light',
  children,
  compact = false,
  className = '',
}) {
  const { t } = useTranslation();
  const photos = (media || []).filter((item) => item?.src).slice(0, 3);
  const hasFacts = Array.isArray(facts) && facts.length > 0;

  return (
    <section
      className={[
        'pageHeader',
        photos.length ? 'withMedia' : '',
        compact ? 'compact' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <div className="pageHeaderBg" aria-hidden="true" />

      <div className="container pageHeaderInner">
        <nav className="phCrumbs" aria-label={t('nav.breadcrumb')}>
          <ol>
            <li>
              <LocalizedLink to="/">{t('nav.home')}</LocalizedLink>
            </li>
            {crumbs.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                <li aria-hidden="true" className="phCrumbSep">
                  <ChevronRight />
                </li>
                <li>
                  {crumb.to && index < crumbs.length - 1 ? (
                    <LocalizedLink to={crumb.to}>{crumb.label}</LocalizedLink>
                  ) : (
                    <span aria-current={index === crumbs.length - 1 ? 'page' : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>

        <div className="phGrid">
          <div className="phMain">
            {eyebrow && (
              <p className="phEyebrow">
                {Icon ? <Icon aria-hidden="true" /> : <span className="phDot" aria-hidden="true" />}
                {eyebrow}
              </p>
            )}

            <h1>
              {title}
              {accent && <span>{accent}</span>}
            </h1>

            {lead && <p className="phLead">{lead}</p>}

            {children}

            {actions && <div className="phActions">{actions}</div>}
          </div>

          {photos.length > 0 && (
            <div className={`phMedia count${photos.length} ${mediaTone === 'glass' ? 'glass' : ''}`} aria-hidden="true">
              {photos.map((photo) => (
                <figure key={photo.src}>
                  <img src={photo.src} alt="" loading="eager" decoding="async" />
                </figure>
              ))}
            </div>
          )}
        </div>

        {hasFacts && (
          <dl className="phFacts">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.value}</dt>
                <dd>{fact.label}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
