import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, FilePlus2, FileSignature, Inbox } from 'lucide-react';

import { convertMeetingToQuote, saveMeetingResult } from '../../services/adminApi';
import { notifyMeetingsChanged, notifyQuotesChanged } from '../../services/adminAuth';
import { formatDate, quoteReference } from '../../components/admin/quoteStatus';
import { MEETING_OUTCOMES, meetingTopic } from '../../components/admin/meetingStatus';

/*
  "Görüşme sonucu" on a held meeting: what was agreed (notes) and the outcome.
  "Teklif hazırlanacak" turns the meeting into a quote request (customer,
  subject, notes, the attending staff member as owner); the proforma is then
  prepared on that request as usual. One meeting gives one quote request.
*/
export default function MeetingResultCard({ meeting, call, onChange, onNotice }) {
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState(meeting.result?.outcome || '');
  const [note, setNote] = useState(meeting.result?.note || '');
  const [product, setProduct] = useState(meetingTopic(meeting));
  const [quantity, setQuantity] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [saving, setSaving] = useState('');

  useEffect(() => {
    setOutcome(meeting.result?.outcome || '');
    setNote(meeting.result?.note || '');
  }, [meeting._id, meeting.result?.outcome, meeting.result?.note]);

  const converted = Boolean(meeting.quoteId);
  const changed = outcome !== (meeting.result?.outcome || '') || note !== (meeting.result?.note || '');

  async function save() {
    setSaving('result');
    try {
      const response = await call(saveMeetingResult, meeting._id, { outcome, note });
      onChange(response.data);
      notifyMeetingsChanged();
      onNotice({ tone: 'success', text: 'Görüşme sonucu kaydedildi.' });
    } catch (err) {
      onNotice({ tone: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function convert(openOffer) {
    setSaving(openOffer ? 'offer' : 'quote');
    try {
      const response = await call(convertMeetingToQuote, meeting._id, { product, quantity, note, followUpAt });
      onChange(response.data);
      notifyMeetingsChanged();
      notifyQuotesChanged();
      navigate(`/admin/quotes/${response.quoteId}${openOffer ? '/offer' : ''}`);
    } catch (err) {
      // Already converted: go to the existing request
      if (err.status === 409 && meeting.quoteId) navigate(`/admin/quotes/${meeting.quoteId}`);
      else onNotice({ tone: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  return (
    <article className="adCard mtResultCard">
      <div className="adCardHead">
        <h2><ClipboardCheck aria-hidden="true" />Görüşme sonucu</h2>
        {meeting.result?.recordedAt && <small className="adHint">{meeting.result.recordedBy} · {formatDate(meeting.result.recordedAt, true)}</small>}
      </div>

      {converted ? (
        <div className="mtConverted">
          <span className="mtConvertedIcon" aria-hidden="true"><Inbox /></span>
          <div>
            <strong>Teklif talebine dönüştürüldü · {quoteReference(meeting.quoteId)}</strong>
            <small>Proforma, takip tarihi ve sonuç (kazanıldı / kaybedildi) teklif talebinden yönetilir.</small>
          </div>
          <div className="mtConvertedActions">
            <Link to={`/admin/quotes/${meeting.quoteId}`} className="cmsButton">Teklif talebini aç <ArrowRight aria-hidden="true" /></Link>
            <Link to={`/admin/quotes/${meeting.quoteId}/offer`} className="cmsButton cmsButtonPrimary"><FileSignature aria-hidden="true" />Proforma</Link>
          </div>
        </div>
      ) : (
        <div className="mtOutcomes" role="radiogroup" aria-label="Görüşmenin sonucu">
          {MEETING_OUTCOMES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={outcome === item.id}
              className={`mtOutcome tone-${item.tone} ${outcome === item.id ? 'active' : ''}`}
              onClick={() => setOutcome(item.id)}
            >
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </button>
          ))}
        </div>
      )}

      <label className="cmsField" style={{ marginTop: 14 }}>
        <span>Görüşme notu <small>(müşteriye gitmez)</small></span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          maxLength={3000}
          placeholder="Konuşulan ürünler, adetler, ölçüler, renk, teslim yeri ve zamanı, bütçe, karar verici, sonraki adım…"
        />
      </label>

      {!converted && outcome === 'quote' && (
        <div className="mtQuoteBox">
          <p className="mtQuoteTitle"><FilePlus2 aria-hidden="true" />Teklif talebi olarak açılacak</p>
          <div className="mtTwo" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 0.8fr) minmax(0, 1.2fr)' }}>
            <label className="cmsField">
              <span>Ürün / konu</span>
              <input value={product} onChange={(event) => setProduct(event.target.value)} maxLength={150} />
            </label>
            <label className="cmsField">
              <span>Adet</span>
              <input type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="—" />
            </label>
            <label className="cmsField">
              <span>Takip tarihi</span>
              <input type="date" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} />
            </label>
          </div>
          <small className="adHint">
            Müşteri bilgileri, görüşme notu ve kaynak (toplantı) aktarılır; sorumlu: {meeting.staff?.[0]?.name || 'siz'}. Müşteriye e-posta gitmez.
          </small>
          <div className="mtFormActions">
            <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => convert(true)} disabled={Boolean(saving)}>
              <FileSignature aria-hidden="true" />
              {saving === 'offer' ? 'Oluşturuluyor…' : 'Dönüştür ve proforma hazırla'}
            </button>
            <button type="button" className="cmsButton" onClick={() => convert(false)} disabled={Boolean(saving)}>
              {saving === 'quote' ? 'Oluşturuluyor…' : 'Yalnızca teklif talebi aç'}
            </button>
          </div>
        </div>
      )}

      {(converted || outcome !== 'quote') && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="cmsButton" onClick={save} disabled={saving === 'result' || !changed || (!outcome && !note)}>
            {saving === 'result' ? 'Kaydediliyor…' : 'Sonucu kaydet'}
          </button>
        </div>
      )}
    </article>
  );
}
