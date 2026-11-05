import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import { getConsents, withdrawConsents } from '../../services/adminApi';
import useAdminApi from '../../hooks/useAdminApi';
import { useConfirm } from '../ui/ConfirmDialog';
import { formatDate } from './quoteStatus';

const BOX_LABELS = {
  A: 'Pazarlama açık rızası (A)',
  'B-email': 'Ticari ileti – e-posta (B)',
  'B-sms': 'Ticari ileti – SMS (B)',
  'B-call': 'Ticari ileti – arama (B)',
  C: 'Reklam eşleştirme / hash (C)',
};

/*
  KVKK boxes this e-mail address ticked on the website forms (latest answer
  per box) and, when the person asks, taking every consent back. Taking back
  puts the e-mail and phone on the opt-out list (ret listesi).
*/
export default function ConsentCard({ email }) {
  const call = useAdminApi();
  const confirm = useConfirm();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await call(getConsents, email);
      setState(response.data);
    } catch (err) {
      setError(err.message);
    }
  }, [call, email]);

  useEffect(() => { load(); }, [load]);

  // Newest record per box
  const latest = {};
  (state?.records || []).forEach((record) => { if (!latest[record.box]) latest[record.box] = record; });
  const standing = Object.values(latest).some((record) => record.value && !record.withdrawnAt);

  async function withdraw() {
    const ok = await confirm({
      title: 'Pazarlama onayları geri alınsın mı?',
      message: `${email} adresinin verdiği tüm onaylar (A, B, C) geri alınır ve e-posta / telefon ret listesine yazılır. Bu adrese bir daha pazarlama iletisi gönderilmemelidir.`,
      confirmLabel: 'Onayları Geri Al',
      tone: 'warning',
    });
    if (!ok) return;

    setBusy(true);
    setError('');
    try {
      await call(withdrawConsents, email);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adCard">
      <div className="adCardHead"><h2><ShieldCheck aria-hidden="true" />KVKK İzinleri</h2></div>

      {error && <div className="adminInlineError" role="alert">{error}</div>}

      {state && (Object.keys(latest).length ? (
        <dl className="adFacts compact">
          {Object.keys(BOX_LABELS).filter((box) => latest[box]).map((box) => {
            const record = latest[box];
            const text = record.withdrawnAt
              ? `Geri alındı · ${formatDate(record.withdrawnAt, true)}`
              : record.value ? `Evet · ${formatDate(record.givenAt, true)}` : 'Hayır';
            return <div key={box}><dt>{BOX_LABELS[box]}</dt><dd title={record.textVersion}>{text}</dd></div>;
          })}
        </dl>
      ) : (
        <p className="adNotesEmpty">Bu adresle yeni formlardan izin kaydı yok.</p>
      ))}

      {state?.suppressed && <small className="cmsHint">Bu adres ret listesinde: pazarlama iletisi gönderilmez.</small>}

      {standing && (
        <div className="adUserFormActions">
          <button type="button" className="cmsButton cmsButtonWarning" onClick={withdraw} disabled={busy}>
            {busy ? 'İşleniyor…' : 'Onayları Geri Al'}
          </button>
        </div>
      )}
    </div>
  );
}
