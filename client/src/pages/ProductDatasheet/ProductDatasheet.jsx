import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileDown } from 'lucide-react';

import Seo from '../../seo/Seo';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import useLanguage from '../../hooks/useLanguage';
import { familyText, findModel, modelPath } from '../../data/productTables';
import NotFound from '../NotFound/NotFound';
import DatasheetDocument from './DatasheetDocument';

/*
  Printable A4 datasheet of one catalogue model:
  /tr/product-tables/vertical-tanks/rd-5000/datasheet
  The sheet opens as a page; "Save as PDF" uses the browser's print dialog, so
  Turkish and Arabic text render exactly as on the site. The sheet itself
  (DatasheetDocument) is also captured off-screen for the proforma e-mail
  (AdminQuoteOffer.jsx), so both stay the exact same design.
*/
export default function ProductDatasheet() {
  const { t } = useTranslation();
  const { code: lang, dir } = useLanguage();
  const { familyId, modelSlug } = useParams();

  const match = findModel(familyId, modelSlug);

  if (!match) return <NotFound />;

  const { family, row } = match;
  const title = familyText(family, 'title', lang, t);
  const d = (key, options) => t(`datasheet.${key}`, options);

  return (
    <main className="dsPage" dir={dir}>
      <Seo title={`${row.code} – ${d('title')}`} description={`${row.code} ${title} – ${d('title')}`} noindex />

      <div className="dsToolbar">
        <LocalizedLink to={modelPath(family, row)} className="dsBack">
          <ArrowLeft aria-hidden="true" className="dsFlip" />
          {d('back')}
        </LocalizedLink>
        <div className="dsToolbarActions">
          <small>{d('saveHint')}</small>
          <button type="button" className="button primary" onClick={() => window.print()}>
            <FileDown aria-hidden="true" />
            <span>{d('save')}</span>
          </button>
        </div>
      </div>

      <DatasheetDocument family={family} row={row} lang={lang} t={t} />
    </main>
  );
}
