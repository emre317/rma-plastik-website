import { useTranslation } from 'react-i18next';

import PageHeader from '../../components/ui/PageHeader';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import { openConsentSettings } from '../../analytics/consent';
import Seo from '../../seo/Seo';
import { consentTexts, cookiePolicy, privacyNotice, VERSION_LINE } from './legalTexts';

/*
  /kvkk (Web Sitesi Formları Aydınlatma Metni + the consent texts behind the
  form boxes) and /cerez-politikasi (Çerez Politikası). The texts are the
  lawyer's Turkish texts in every site language for now; the English and
  Arabic pages say so above the text.
*/
function Blocks({ blocks }) {
  return blocks.map((block, index) => {
    const key = `${block.type}-${index}`;

    if (block.type === 'h2') return <h2 key={key} id={block.id}>{block.text}</h2>;
    if (block.type === 'h3') return <h3 key={key}>{block.text}</h3>;
    if (block.type === 'ul') return <ul key={key}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;

    if (block.type === 'table') {
      return (
        <div key={key} className="legalTableWrap">
          <table className="legalTable">
            <thead><tr>{block.head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={`${row[0]}-${r}`}>
                  {row.map((cell, c) => (
                    <td key={c} data-label={block.head[c]}>
                      {String(cell).split('\n').map((line) => <span key={line} className="legalCellLine">{line}</span>)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <p key={key}>
        {block.text}
        {block.cookieLink && <> <LocalizedLink to="/cerez-politikasi">Çerez Politikası</LocalizedLink></>}
        {block.noticeLink && <> <LocalizedLink to="/kvkk">Aydınlatma Metni</LocalizedLink></>}
        {block.settingsButton && (
          <> <button type="button" className="legalSettingsButton" onClick={openConsentSettings}>Çerez tercihlerini aç</button></>
        )}
      </p>
    );
  });
}

export default function LegalPage({ kind }) {
  const { t, i18n } = useTranslation();
  const isNotice = kind === 'kvkk';
  const doc = isNotice ? privacyNotice : cookiePolicy;
  const path = isNotice ? '/kvkk' : '/cerez-politikasi';
  const title = t(isNotice ? 'meta.titles.kvkk' : 'meta.titles.cookiePolicy');

  return (
    <main className="internalPage legalPage">
      <Seo
        title={title}
        description={t(isNotice ? 'meta.descriptions.kvkk' : 'meta.descriptions.cookiePolicy')}
        breadcrumbs={[{ name: title, path }]}
      />

      <PageHeader compact crumbs={[{ label: title }]} eyebrow={t('legal.eyebrow')} title={doc.title} />

      <section className="section">
        <div className="container legalBody">
          {i18n.resolvedLanguage !== 'tr' && <p className="legalLanguageNote">{t('legal.turkishOnly')}</p>}

          <article lang="tr" dir="ltr">
            <Blocks blocks={doc.blocks} />

            {isNotice && (
              <>
                <h2 id="izin-metinleri">Form İzin Metinleri</h2>
                {consentTexts.map((text) => (
                  <section key={text.id} id={text.id} className="legalConsent">
                    <h3>{text.title}</h3>
                    {text.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)}
                    <small>Sürüm: {text.version} · {VERSION_LINE}</small>
                  </section>
                ))}
              </>
            )}
          </article>
        </div>
      </section>
    </main>
  );
}
