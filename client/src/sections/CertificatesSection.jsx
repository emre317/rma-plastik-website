import { useTranslation } from 'react-i18next';
import { BadgeCheck } from 'lucide-react';

import Arrow from '../components/i18n/Arrow';
import { LocalizedLink } from '../components/i18n/LocalizedLink';
import {
  CertificateSeal, categoryOf, certificateAnchor, isStandard,
} from '../components/certificates/CertificateParts';
import certificates, { certificateDate, certificateText } from '../data/certificates';

/*
  Certificates strip (home page and company page): a card per certificate
  with its seal, the certificate itself as a tilted sheet and the validity,
  linking to the Kalite ve Sertifikalar page.
*/
export default function CertificatesSection({ id = 'certificates' }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'tr';

  if (!certificates.length) return null;

  return (
    <section className="certStrip" id={id} data-track-area="certificates_section">
      <div className="container">
        <div className="certStripHead">
          <div>
            <p className="eyebrow">{t('certificates.section.eyebrow')}</p>
            <h2>
              {t('certificates.section.title')} <span>{t('certificates.section.titleAccent')}</span>
            </h2>
          </div>
          <div className="certStripIntro">
            <p>{t('certificates.section.text')}</p>
            <LocalizedLink to="/certificates" className="button ghost certStripAll">
              <span>{t('certificates.section.all')}</span>
              <Arrow className="buttonArrow" />
            </LocalizedLink>
          </div>
        </div>

        <ul className="certStripGrid">
          {certificates.map((certificate) => (
            <li key={certificate.code} className={`certMini cat-${categoryOf(certificate)}`}>
              <LocalizedLink to={`/certificates#${certificateAnchor(certificate)}`} className="certMiniLink">
                <span className="certMiniSheet" aria-hidden="true">
                  {certificate.image && <img src={certificate.image} alt="" loading="lazy" decoding="async" width="900" height="1273" />}
                </span>
                <CertificateSeal certificate={certificate} size="sm" />
                <span className="certMiniBody">
                  <small className="certCategory">{t(`certificates.categories.${categoryOf(certificate)}`)}</small>
                  <strong dir={isStandard(certificate) ? 'ltr' : undefined}>{certificate.code}</strong>
                  <span className="certMiniTitle">{certificateText(certificate, 'title', lang)}</span>
                  {certificate.validUntil && (
                    <span className="certValid">
                      <BadgeCheck aria-hidden="true" />
                      {t('certificates.valid', { date: certificateDate(certificate.validUntil, lang, 'short') })}
                    </span>
                  )}
                </span>
              </LocalizedLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
