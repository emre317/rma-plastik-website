import { useEffect, useState } from 'react';
import { CalendarOff, ChevronDown, Plus, Trash2 } from 'lucide-react';

import { createMeetingBlock, deleteMeetingBlock, getMeetingBlocks } from '../../services/adminApi';
import { istanbulParts } from '../../data/meetingForm';

const format = (value, options) => new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', ...options }).format(new Date(value));

/* "10 Kas Sal – 12 Kas Per (tüm gün)" or "10 Kas Sal 09:00–12:00" */
function rangeText(block) {
  const start = istanbulParts(block.start);
  const end = istanbulParts(new Date(new Date(block.end).getTime() - 60000));
  const allDay = start.time === '00:00' && end.time === '23:59';
  const day = (value) => format(value, { day: 'numeric', month: 'short', weekday: 'short' });
  if (allDay) return start.date === end.date ? `${day(block.start)} (tüm gün)` : `${day(block.start)} – ${day(new Date(block.end).getTime() - 60000)} (tüm gün)`;
  return `${day(block.start)} ${format(block.start, { hour: '2-digit', minute: '2-digit' })}–${format(block.end, { hour: '2-digit', minute: '2-digit' })}`;
}

const EMPTY = { from: '', to: '', allDay: true, startTime: '09:00', endTime: '12:00', note: '' };

/*
  Kapalı zamanlar: days or hours the website calendar shows as taken
  (holiday, trade fair, maintenance). Confirmed meetings and, with
  Microsoft 365, busy Outlook calendars close slots by themselves.
*/
export default function MeetingBlocks({ call }) {
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    call(getMeetingBlocks).then((response) => setBlocks(response.data || [])).catch(() => {});
  }, [call]);

  const set = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  async function add(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await call(createMeetingBlock, { ...form, to: form.allDay ? form.to || form.from : form.from });
      setBlocks((list) => [...list, response.data].sort((a, b) => new Date(a.start) - new Date(b.start)));
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await call(deleteMeetingBlock, id);
      setBlocks((list) => list.filter((item) => item._id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className={`adCard mtBlocks ${open ? 'open' : ''}`}>
      <button type="button" className="mtBlocksHead" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <CalendarOff aria-hidden="true" />
        <span>
          <strong>Kapalı zamanlar</strong>
          <small>Sitede toplantı alınmayacak gün ve saatler · {blocks.length ? `${blocks.length} kayıt` : 'kayıt yok'}</small>
        </span>
        <ChevronDown aria-hidden="true" className="mtBlocksChevron" />
      </button>

      {open && (
        <div className="mtBlocksBody">
          <p className="adHint" style={{ margin: 0 }}>
            Onaylı toplantıların saatleri sitede kendiliğinden kapanır. Burada ayrıca bayram, fuar, bakım gibi kapalı zamanları ekleyin.
          </p>

          {blocks.length > 0 && (
            <ul className="mtBlockList">
              {blocks.map((block) => (
                <li key={block._id}>
                  <span><strong>{rangeText(block)}</strong>{block.note && <small>{block.note}</small>}</span>
                  <button type="button" className="adIconButton danger" onClick={() => remove(block._id)} aria-label="Kapalı zamanı kaldır" title="Kaldır"><Trash2 aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}

          <form className="mtBlockForm" onSubmit={add}>
            <label className="cmsField"><span>Başlangıç günü</span><input type="date" value={form.from} onChange={set('from')} required /></label>
            {form.allDay ? (
              <label className="cmsField"><span>Bitiş günü</span><input type="date" value={form.to} min={form.from} onChange={set('to')} placeholder="aynı gün" /></label>
            ) : (
              <>
                <label className="cmsField"><span>Saatten</span><input type="time" value={form.startTime} onChange={set('startTime')} /></label>
                <label className="cmsField"><span>Saate</span><input type="time" value={form.endTime} onChange={set('endTime')} /></label>
              </>
            )}
            <label className="cmsField mtBlockNote"><span>Not</span><input value={form.note} onChange={set('note')} maxLength={160} placeholder="Örn. Kurban Bayramı" /></label>
            <label className="mtBlockAllDay"><input type="checkbox" checked={form.allDay} onChange={set('allDay')} />Tüm gün</label>
            <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving || !form.from}><Plus aria-hidden="true" />{saving ? 'Ekleniyor…' : 'Kapat'}</button>
          </form>
          {error && <div className="adminInlineError" role="alert">{error}</div>}
        </div>
      )}
    </section>
  );
}
