import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BadgeCheck, Building2, CalendarCheck2, Download, ExternalLink, Eye, Globe2, Hash, Layers, ShieldCheck, Stamp,
} from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import QuoteStrip from '../../components/ui/QuoteStrip';
import ImageLightbox from '../../components/ui/ImageLightbox';
import {
  CertificateSeal, categoryOf, certificateAnchor, isStandard,
} from '../../components/certificates/CertificateParts';
import certificates, { certificateDate, certificateText } from '../../data/certificates';

const splitCodeDir = (certificate) => (isStandard(certificate) ? 'ltr' : undefined);


/*
  Kalite ve Sertifikalar: every published certificate as a large card (the
  certificate sheet, its standard and validity, view / PDF / verify), the
  certified scope and a contact panel for stamped copies.
*/
export default function Certificates() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'tr';
  const [open, setOpen] = useState(-1);

  const withImage = certificates.filter((certificate) => certificate.image);
  const slides = withImage.map((certificate) => ({
    src: certificate.image,
    alt: `${certificate.code} – ${certificateText(certificate, 'title', lang)}`,
    title: `${certificate.code} · ${certificateText(certificate, 'title', lang)}`,
  }));

  // One scope paragraph per distinct text (the same scope is usually shared)
  const scopes = useMemo(() => {
    const map = new Map();
    certificates.forEach((certificate) => {
      const scope = certificateText(certificate, 'scope', lang);
      if (!scope) return;
      map.set(scope, [...(map.get(scope) || []), certificate.code]);
    });
    return [...map.entries()];
  }, [lang]);

  const issuers = [...new Set(certificates.map((certificate) => certificate.issuer).filter(Boolean))];
  const accreditations = [...new Set(certificates.map((certificate) => certificate.accreditation).filter(Boolean))];
  const holder = certificates.find((certificate) => certificate.holder)?.holder;
  const standards = certificates.filter(isStandard);

  return (
    <main className="internalPage certPage">
      <Seo
        title={t('meta.titles.certificates')}
        description={t('meta.descriptions.certificates')}
        breadcrumbs={[{ name: t('meta.titles.certificates'), path: '/certificates' }]}
      />

      <PageHeader
        compact
        crumbs={[{ label: t('meta.titles.certificates') }]}
        eyebrow={t('certificates.eyebrow')}
        title={t('certificates.title')}
        accent={t('certificates.titleAccent')}
        lead={t('certificates.text')}
      />

      {certificates.length === 0 ? (
        <section className="certSection">
          <div className="container"><div className="blogEmpty"><p>{t('certificates.empty')}</p></div></div>
        </section>
      ) : (
        <>
          <section className="certHighlights" aria-label={t('certificates.eyebrow')}>
            <div className="container certHighlightsGrid">
              <div className="certHighlight">
                <span className="certHighlightIcon" aria-hidden="true"><Layers /></span>
                <strong dir="ltr">{standards.length || certificates.length}</strong>
                <span>{t('certificates.highlights.standards')}</span>
                <small dir="ltr">{(standards.length ? standards : certificates).map((certificate) => certificate.code.split(':')[0]).join(' · ')}</small>
              </div>
              <div className="certHighlight">
                <span className="certHighlightIcon" aria-hidden="true"><Stamp /></span>
                <strong>{standards.find((certificate) => certificate.issuer)?.issuer || issuers[0] || '—'}</strong>
                <span>{t('certificates.highlights.accredited')}</span>
                {accreditations[0] && <small dir="ltr">{accreditations.join(' · ')}</small>}
              </div>
              <div className="certHighlight">
                <span className="certHighlightIcon" aria-hidden="true"><ShieldCheck /></span>
                <strong>{t('certificates.highlights.verifiable')}</strong>
                <span>{t('certificates.highlights.verifiableText')}</span>
              </div>
            </div>
          </section>

          <section className="certSection">
            <div className="container">
              <ol className="certList">
                {certificates.map((certificate, index) => {
                  const category = categoryOf(certificate);
                  const slideIndex = withImage.indexOf(certificate);
                  const title = certificateText(certificate, 'title', lang);

                  return (
                    <li key={certificate.code} id={certificateAnchor(certificate)} className={`certCard cat-${category}`}>
                      <div className="certCardMedia">
                        {certificate.image ? (
                          <button type="button" className="certSheet" onClick={() => setOpen(slideIndex)} aria-label={`${t('certificates.view')}: ${certificate.code}`}>
                            <img src={certificate.image} alt={`${certificate.code} – ${title}`} loading={index < 2 ? 'eager' : 'lazy'} decoding="async" width="900" height="1273" />
                            <span className="certSheetHint"><Eye aria-hidden="true" />{t('certificates.view')}</span>
                          </button>
                        ) : (
                          <span className="certSheet empty"><CertificateSeal certificate={certificate} size="lg" /></span>
                        )}
                      </div>

                      <div className="certCardBody">
                        <div className="certCardTop">
                          <CertificateSeal certificate={certificate} />
                          <div>
                            <span className="certCategory">{t(`certificates.categories.${category}`)}</span>
                            <h2 dir={splitCodeDir(certificate)}>{certificate.code}</h2>
                            <p className="certTitle">{title}</p>
                          </div>
                        </div>

                        {certificate.validUntil && (
                          <p className="certValid big">
                            <BadgeCheck aria-hidden="true" />
                            {t('certificates.valid', { date: certificateDate(certificate.validUntil, lang) })}
                          </p>
                        )}

                        <dl className="certMeta">
                          {certificate.number && (
                            <div><dt><Hash aria-hidden="true" />{t('certificates.labels.number')}</dt><dd dir="ltr">{certificate.number}</dd></div>
                          )}
                          {certificate.issuer && (
                            <div><dt><Building2 aria-hidden="true" />{t('certificates.labels.issuer')}</dt><dd>{certificate.issuer}</dd></div>
                          )}
                          {certificate.accreditation && (
                            <div><dt><Globe2 aria-hidden="true" />{t('certificates.labels.accreditation')}</dt><dd dir="ltr">{certificate.accreditation}</dd></div>
                          )}
                          {certificate.issuedAt && (
                            <div><dt><CalendarCheck2 aria-hidden="true" />{t('certificates.labels.issuedAt')}</dt><dd>{certificateDate(certificate.issuedAt, lang)}</dd></div>
                          )}
                        </dl>

                        <div className="certActions">
                          {certificate.image && (
                            <button type="button" className="button primary" onClick={() => setOpen(slideIndex)}>
                              <Eye aria-hidden="true" className="buttonIcon" />
                              <span>{t('certificates.view')}</span>
                            </button>
                          )}
                          {certificate.file && (
                            <a href={certificate.file} className="button ghost" target="_blank" rel="noopener" download>
                              <Download aria-hidden="true" className="buttonIcon" />
                              <span>{t('certificates.download')}</span>
                            </a>
                          )}
                          {certificate.verifyUrl && (
                            <a href={certificate.verifyUrl} className="certVerify" target="_blank" rel="noopener noreferrer">
                              <ShieldCheck aria-hidden="true" />
                              {t('certificates.verify')}
                              <ExternalLink aria-hidden="true" className="certVerifyOut" />
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {scopes.length > 0 && (
                <div className="certScope">
                  <span className="certScopeIcon" aria-hidden="true"><Layers /></span>
                  <div>
                    <p className="eyebrow">{t('certificates.scopeTitle')}</p>
                    {holder && <h3>{holder}</h3>}
                    {scopes.map(([scope, codes]) => (
                      <div key={scope} className="certScopeItem">
                        <p>{scope}</p>
                        <span className="certScopeCodes" dir="ltr">{codes.join(' · ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <QuoteStrip title={t('certificates.ctaTitle')} text={t('certificates.ctaText')} buttonLabel={t('nav.contact')} to="/contact" />

          <ImageLightbox slides={slides} index={open} onClose={() => setOpen(-1)} />
        </>
      )}
    </main>
  );
}
