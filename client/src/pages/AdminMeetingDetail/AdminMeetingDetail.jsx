import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Building2, CalendarCheck2, CalendarX2, Check, Clock3, ExternalLink, Mail, MapPin, MessageSquareText,
  NotebookPen, Phone, Plus, Send, Trash2, UserPlus, Users, Video, X,
} from 'lucide-react';

import {
  cancelMeeting, confirmMeeting, deleteMeeting, getMeeting, getMeetingConfig, getMeetingStaff, updateMeetingNote,
} from '../../services/adminApi';
import { notifyMeetingsChanged } from '../../services/adminAuth';
import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { useAdminSession } from '../../components/admin/AdminSession';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { LANGUAGE_LABELS, formatDate } from '../../components/admin/quoteStatus';
import {
  MEETING_TYPE, meetingReference, meetingStatusLabel, meetingStatusTone, meetingTopic, meetingWhen,
} from '../../components/admin/meetingStatus';
import company from '../../data/company';
import MeetingResultCard from './MeetingResultCard';
import { isHeld } from '../../components/admin/meetingStatus';
import { MEETING_DEFAULT_DURATION, MEETING_DURATIONS, istanbulDateTime, istanbulParts } from '../../data/meetingForm';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_LOCATION = `${company.name}, ${company.address.street}, ${company.address.district}, ${company.address.country}`.replace(/ /g, ' ');

const MAIL_LABELS = { notification: 'info@ bildirimi', receipt: 'Müşteriye alındı e-postası', customer: 'Müşteriye onay / değişiklik', staff: 'RMA katılımcılarına', reminder: 'Hatırlatma (müşteri ve RMA)' };
const MAIL_STATUS = { sent: 'Gönderildi', failed: 'Gönderilemedi', skipped: 'Atlandı (SMTP yok)' };

/* "Gönderildi · 9 Kas 09:00" or "9 Kas Pazartesi · 10:00 civarı gönderilecek" */
function reminderText(meeting, hours) {
  const start = new Date(meeting.startAt).getTime();
  if (meeting.reminder?.forStart && new Date(meeting.reminder.forStart).getTime() === start) {
    return `Gönderildi · ${formatDate(meeting.reminder.sentAt, true)}`;
  }
  if (start < Date.now()) return 'Gönderilmedi';
  const due = new Date(start - hours * 3600 * 1000);
  return due.getTime() <= Date.now() ? 'Kısa süre içinde gönderilecek' : `${meetingWhen(due)} civarı gönderilecek (${hours} saat önce)`;
}

const initial = (text) => String(text || '?').trim().charAt(0).toLocaleUpperCase('tr');

/* Teams "new meeting" form, filled in (used when Graph is not set up) */
function teamsDeepLink(meeting, start, duration, staff) {
  if (!start) return '';
  const end = new Date(start.getTime() + duration * 60000);
  const attendees = [meeting.email, ...(meeting.guests || []).map((guest) => guest.email), ...staff.map((person) => person.email)].filter(Boolean);
  const params = new URLSearchParams({
    subject: `RMA Plastik – ${meeting.company}`,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    content: `${meetingTopic(meeting)} (${meetingReference(meeting._id)})`,
    attendees: attendees.join(','),
  });
  return `https://teams.microsoft.com/l/meeting/new?${params.toString()}`;
}

/* One meeting request: details, then confirm / change / cancel */
export default function AdminMeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const call = useAdminApi();
  const confirmDialog = useConfirm();
  const { admin, can } = useAdminSession();

  const [meeting, setMeeting] = useState(null);
  const [config, setConfig] = useState({ teams: false });
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState('');

  // Form
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(MEETING_DEFAULT_DURATION);
  const [staff, setStaff] = useState([]);
  const [extra, setExtra] = useState({ name: '', email: '' });
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [useTeams, setUseTeams] = useState(true);
  const [joinUrl, setJoinUrl] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  // A held meeting: the edit form opens only when asked (e.g. the customer did not come)
  const [editHeld, setEditHeld] = useState(false);

  usePageTitle(meeting ? `Toplantı · ${meeting.company}` : 'Toplantı');

  function fill(data) {
    const parts = istanbulParts(data.startAt);
    setMeeting(data);
    setDate(parts.date);
    setTime(parts.time);
    setDuration(data.durationMinutes || MEETING_DEFAULT_DURATION);
    setStaff((data.staff || []).map((person) => ({ userId: person.userId || null, name: person.name, email: person.email, title: person.title || '' })));
    setLocation(data.location || DEFAULT_LOCATION);
    setJoinUrl(data.joinUrl || '');
    setUseTeams(Boolean(data.teams?.eventId) || !data.joinUrl);
    setCustomerNote(data.status === 'confirmed' ? data.customerNote || '' : '');
    setInternalNote(data.internalNote || '');
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [response, settings, staffList] = await Promise.all([
          call(getMeeting, id),
          call(getMeetingConfig).catch(() => null),
          call(getMeetingStaff).catch(() => null),
        ]);
        if (cancelled) return;
        fill(response.data);
        setConfig(settings?.data || { teams: false });
        setPeople(staffList?.data || []);
        notifyMeetingsChanged();
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [call, id]);

  // A new request: the person who opens it is suggested as attendee
  useEffect(() => {
    if (!meeting || meeting.status !== 'pending' || staff.length || !admin?.email) return;
    const me = people.find((person) => person.email === admin.email);
    if (me) setStaff([me]);
  }, [meeting, people, admin, staff.length]);

  const start = useMemo(() => istanbulDateTime(date, time), [date, time]);
  const requested = meeting ? new Date(meeting.requestedStartAt) : null;
  const moved = Boolean(start && requested && start.getTime() !== requested.getTime());
  const isOnline = meeting?.type === 'online';
  const isConfirmed = meeting?.status === 'confirmed';
  const isCancelled = meeting?.status === 'cancelled';
  const teamsAuto = isOnline && config.teams && useTeams;

  const hasPerson = (email) => staff.some((person) => person.email === email);
  const togglePerson = (person) => setStaff((list) => (hasPerson(person.email) ? list.filter((item) => item.email !== person.email) : [...list, person]));

  function addExtra() {
    const email = extra.email.trim().toLowerCase();
    if (!EMAIL.test(email)) {
      setNotice({ tone: 'error', text: 'Eklemek istediğiniz kişi için geçerli bir e-posta adresi yazın.' });
      return;
    }
    if (!hasPerson(email)) setStaff((list) => [...list, { userId: null, name: extra.name.trim() || email.split('@')[0], email, title: '' }]);
    setExtra({ name: '', email: '' });
    setNotice(null);
  }

  const mailLine = (mail) => {
    if (!mail) return '';
    const parts = [mail.customer && `müşteri: ${MAIL_STATUS[mail.customer.status]}`, mail.staff && `çalışanlar: ${MAIL_STATUS[mail.staff.status]}`].filter(Boolean);
    return parts.length ? ` E-postalar – ${parts.join(', ')}.` : '';
  };

  async function save() {
    setNotice(null);
    if (!start) return setNotice({ tone: 'error', text: 'Tarih ve saat seçin.' });
    if (!staff.length) return setNotice({ tone: 'error', text: 'Toplantıya katılacak en az bir RMA çalışanı seçin.' });
    if (!isOnline && !location.trim()) return setNotice({ tone: 'error', text: 'Görüşme yerini yazın.' });
    if (isOnline && !teamsAuto && !/^https:\/\//i.test(joinUrl.trim())) return setNotice({ tone: 'error', text: 'Teams toplantı bağlantısını (https://…) yapıştırın.' });

    const question = isConfirmed
      ? { title: 'Değişiklikler gönderilsin mi?', message: 'Müşteriye, katılımcılara ve RMA çalışanlarına güncel bilgilerle e-posta ve takvim güncellemesi gider.', confirmLabel: 'Kaydet ve Bildir' }
      : { title: 'Toplantı onaylansın mı?', message: `${meetingWhen(start)} için müşteriye${isOnline ? ', katılımcılarına' : ''} ve seçilen çalışanlara onay e-postası ve takvim daveti gönderilir.${moved ? ' Talep edilen zamandan farklı olduğu e-postada belirtilir.' : ''}`, confirmLabel: 'Onayla ve Gönder' };
    if (!(await confirmDialog(question))) return;

    setSaving('confirm');
    try {
      const response = await call(confirmMeeting, id, {
        date,
        time,
        durationMinutes: duration,
        staff,
        location: isOnline ? '' : location,
        useTeams: teamsAuto,
        joinUrl: teamsAuto ? '' : joinUrl.trim(),
        customerNote,
        internalNote,
      });
      fill(response.data);
      notifyMeetingsChanged();
      setNotice({ tone: 'success', text: `${response.updated ? 'Toplantı güncellendi.' : 'Toplantı onaylandı.'}${mailLine(response.mail)}` });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function cancel() {
    setSaving('cancel');
    setNotice(null);
    try {
      const response = await call(cancelMeeting, id, { customerNote: cancelNote });
      fill(response.data);
      setCancelOpen(false);
      notifyMeetingsChanged();
      setNotice({ tone: 'success', text: `${isConfirmed ? 'Toplantı iptal edildi.' : 'Talep reddedildi.'}${mailLine(response.mail)}` });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function saveNote() {
    setSaving('note');
    try {
      const response = await call(updateMeetingNote, id, internalNote);
      setMeeting(response.data);
      setNotice({ tone: 'success', text: 'İç not kaydedildi.' });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setSaving('');
    }
  }

  async function remove() {
    if (!(await confirmDialog({ title: 'Kayıt silinsin mi?', message: 'Toplantı kaydı kalıcı olarak silinir. Müşteriye e-posta gitmez.', confirmLabel: 'Kaydı Sil', tone: 'danger' }))) return;
    try {
      await call(deleteMeeting, id);
      notifyMeetingsChanged();
      navigate('/admin/meetings', { replace: true });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    }
  }

  if (loading) {
    return (
      <section className="adminContent">
        <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>
      </section>
    );
  }

  if (!meeting) {
    return (
      <section className="adminContent">
        <Link to="/admin/meetings" className="adBack"><ArrowLeft aria-hidden="true" />Toplantılar</Link>
        <div className="adminInlineError" role="alert">{error || 'Toplantı bulunamadı.'}</div>
      </section>
    );
  }

  const deepLink = isOnline ? teamsDeepLink(meeting, start, duration, staff) : '';
  const extraPeople = staff.filter((person) => !people.some((item) => item.email === person.email));
  const mailEntries = Object.entries(meeting.mail || {}).filter(([, value]) => value?.status);

  return (
    <section className="adminContent adMeetingDetail">
      <Link to="/admin/meetings" className="adBack"><ArrowLeft aria-hidden="true" />Toplantılar</Link>

      <header className="adDetailHead">
        <div>
          <span className="adDetailTags">
            <span className={`adPill tone-${meetingStatusTone(meeting)}`}>{meetingStatusLabel(meeting)}</span>
            <span className={`adPill ${isOnline ? 'tone-violet' : 'tone-blue'}`}>{MEETING_TYPE[meeting.type]}</span>
            <span className="adRef">{meetingReference(meeting._id)}</span>
          </span>
          <h1>{meeting.company}</h1>
          <p>{formatDate(meeting.createdAt, true)} tarihinde {LANGUAGE_LABELS[meeting.language] || 'site'} sayfasından gönderildi</p>
        </div>
        <div className="adContactActions">
          <a className="cmsButton cmsButtonPrimary" href={`mailto:${meeting.email}?subject=${encodeURIComponent(`RMA Plastik toplantı talebiniz (${meetingReference(meeting._id)})`)}`}>
            <Mail aria-hidden="true" />E-posta Yaz
          </a>
          {meeting.phone && <a className="cmsButton" href={`tel:${meeting.phone.replace(/\s/g, '')}`}><Phone aria-hidden="true" />Ara</a>}
        </div>
      </header>

      {notice && <div className={`adNotice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}><span>{notice.text}</span></div>}

      <div className="mtDetailGrid">
        <div style={{ display: 'grid', gap: 18 }}>
          {/* After the meeting: outcome, notes and "turn into a quote" come first */}
          {isHeld(meeting) && (
            <MeetingResultCard meeting={meeting} call={call} onChange={setMeeting} onNotice={setNotice} />
          )}

          <article className="adCard">
            <div className="adCardHead"><h2><CalendarCheck2 aria-hidden="true" />Talep</h2></div>
            <dl className="mtDl">
              <dt>Toplantı türü</dt><dd>{isOnline ? 'Online – Microsoft Teams' : 'Yüz yüze'}</dd>
              <dt>Talep edilen zaman</dt><dd>{meetingWhen(meeting.requestedStartAt)} <small>(Türkiye)</small></dd>
              {isConfirmed && <><dt>Onaylanan zaman</dt><dd>{meetingWhen(meeting.startAt)} · {meeting.durationMinutes} dk</dd></>}
              <dt>Konu</dt><dd>{meetingTopic(meeting)}</dd>
              {isConfirmed && !isOnline && <><dt>Yer</dt><dd>{meeting.location}</dd></>}
              {isConfirmed && isOnline && meeting.joinUrl && (
                <><dt>Teams bağlantısı</dt><dd><a className="mtTeamsLink" href={meeting.joinUrl} target="_blank" rel="noreferrer"><Video aria-hidden="true" />Toplantıya katıl</a></dd></>
              )}
              {isConfirmed && config.reminders !== false && <><dt>Hatırlatma</dt><dd>{reminderText(meeting, config.reminderHours || 24)}</dd></>}
              {meeting.handledBy?.name && <><dt>İşlemi yapan</dt><dd>{meeting.handledBy.name}</dd></>}
            </dl>
            {meeting.message && <p className="mtMessage">{meeting.message}</p>}
          </article>

          <article className="adCard">
            <div className="adCardHead"><h2><Building2 aria-hidden="true" />Müşteri</h2></div>
            <dl className="mtDl">
              <dt>Firma</dt><dd>{meeting.company}</dd>
              <dt>Yetkili</dt><dd>{meeting.name}</dd>
              <dt>E-posta</dt><dd><a href={`mailto:${meeting.email}`}>{meeting.email}</a></dd>
              {meeting.phone && <><dt>Telefon</dt><dd><a href={`tel:${meeting.phone.replace(/\s/g, '')}`}>{meeting.phone}</a></dd></>}
              {meeting.country && <><dt>Ülke</dt><dd>{meeting.country}</dd></>}
              {meeting.attribution?.channel && <><dt>Kaynak</dt><dd>{meeting.attribution.channel}</dd></>}
            </dl>
          </article>

          {isOnline && (
            <article className="adCard">
              <div className="adCardHead"><h2><Users aria-hidden="true" />Müşteri tarafından katılımcılar</h2></div>
              {(meeting.guests || []).length ? (
                <ul className="mtPeople">
                  {meeting.guests.map((guest) => (
                    <li key={guest.email}>
                      <span className="adAvatarSm" aria-hidden="true">{initial(guest.name || guest.email)}</span>
                      <span>{guest.name || '—'}<small>{guest.email}</small></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="adEmpty">Başka katılımcı eklenmedi; davet yalnızca {meeting.email} adresine gider.</p>}
            </article>
          )}

          <article className="adCard">
            <div className="adCardHead"><h2><NotebookPen aria-hidden="true" />İç not</h2></div>
            <label className="cmsField">
              <span className="visuallyHidden">İç not</span>
              <textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} rows={3} maxLength={2000} placeholder="Müşteriye gitmez; katılımcı çalışanların e-postasında görünür." />
            </label>
            <div style={{ marginTop: 10 }}>
              <button type="button" className="cmsButton" onClick={saveNote} disabled={saving === 'note' || internalNote === (meeting.internalNote || '')}>
                {saving === 'note' ? 'Kaydediliyor…' : 'Notu kaydet'}
              </button>
            </div>
          </article>

          {mailEntries.length > 0 && (
            <article className="adCard">
              <div className="adCardHead"><h2><Send aria-hidden="true" />E-postalar</h2></div>
              <ul className="mtMailStatus">
                {mailEntries.map(([kind, value]) => (
                  <li key={kind} title={value.error || ''}>
                    <span>{MAIL_LABELS[kind] || kind}</span>
                    <span className={value.status}>{MAIL_STATUS[value.status]} · {formatDate(value.at, true)}</span>
                  </li>
                ))}
              </ul>
            </article>
          )}

          {can('users') && (
            <div>
              <button type="button" className="cmsButton cmsButtonDanger" onClick={remove}><Trash2 aria-hidden="true" />Kaydı sil</button>
            </div>
          )}
        </div>

        <aside className="adCard mtActionCard">
          {isHeld(meeting) && !editHeld ? (
            <>
              <div className="adCardHead"><h2><Check aria-hidden="true" />Toplantı gerçekleşti</h2></div>
              <p className="adHint">{meetingWhen(meeting.startAt)} · {meeting.durationMinutes} dk · {(meeting.staff || []).map((person) => person.name).join(', ')}</p>
              <p className="adHint">Görüşmenin notunu ve sonucunu soldaki karta girin; teklif çıkacaksa oradan teklif talebine dönüştürün.</p>
              <button type="button" className="cmsButton" onClick={() => setEditHeld(true)}>
                <CalendarCheck2 aria-hidden="true" />Yeni zaman planla
              </button>
            </>
          ) : isCancelled ? (
            <>
              <div className="adCardHead"><h2><CalendarX2 aria-hidden="true" />Toplantı iptal edildi</h2></div>
              <p className="adHint">{meeting.cancelledAt ? `${formatDate(meeting.cancelledAt, true)} tarihinde iptal edildi.` : ''} {meeting.customerNote ? `Müşteriye not: “${meeting.customerNote}”` : ''}</p>
              <p className="adHint">Yeniden görüşmek için müşteriden siteden yeni bir talep göndermesini isteyebilirsiniz.</p>
            </>
          ) : (
            <>
              <div className="adCardHead">
                <h2><CalendarCheck2 aria-hidden="true" />{isConfirmed ? 'Toplantıyı düzenle' : 'Onayla'}</h2>
              </div>

              <div className="mtFormStack">
                <div className="mtTwo">
                  <label className="cmsField">
                    <span>Tarih</span>
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                  </label>
                  <label className="cmsField">
                    <span>Saat</span>
                    <input type="time" value={time} step={300} onChange={(event) => setTime(event.target.value)} />
                  </label>
                  <label className="cmsField">
                    <span>Süre</span>
                    <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                      {MEETING_DURATIONS.map((value) => <option key={value} value={value}>{value} dk</option>)}
                    </select>
                  </label>
                </div>
                <small className="adHint"><Clock3 aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> Türkiye saati. Müşterinin istediği: {meetingWhen(meeting.requestedStartAt)}</small>
                {moved && <div className="mtChanged">Zaman talep edilenden farklı: müşteriye yeni zaman bildirilecek.</div>}

                <div className="mtStaffPicker">
                  <span className="mtLabel"><Users aria-hidden="true" />{isOnline ? 'RMA’dan katılacaklar' : 'Görüşecek RMA çalışanı'}</span>
                  <div className="mtStaffList">
                    {people.map((person) => (
                      <button key={person.email} type="button" className={`mtStaffChip ${hasPerson(person.email) ? 'active' : ''}`} onClick={() => togglePerson(person)} aria-pressed={hasPerson(person.email)} title={person.email}>
                        <span className="adAvatarSm" aria-hidden="true">{hasPerson(person.email) ? <Check /> : initial(person.name)}</span>
                        {person.name}
                      </button>
                    ))}
                    {extraPeople.map((person) => (
                      <button key={person.email} type="button" className="mtStaffChip active" onClick={() => togglePerson(person)} title={`${person.email} – kaldırmak için tıklayın`}>
                        <span className="adAvatarSm" aria-hidden="true"><X /></span>
                        {person.name}
                      </button>
                    ))}
                  </div>
                  <div className="mtExtra">
                    <input value={extra.name} onChange={(event) => setExtra((value) => ({ ...value, name: event.target.value }))} placeholder="Panelde olmayan kişi: ad" aria-label="Eklenecek kişinin adı" />
                    <input type="email" value={extra.email} onChange={(event) => setExtra((value) => ({ ...value, email: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addExtra(); } }} placeholder="e-posta" aria-label="Eklenecek kişinin e-postası" />
                    <button type="button" className="cmsButton" onClick={addExtra}><UserPlus aria-hidden="true" />Ekle</button>
                  </div>
                </div>

                {!isOnline && (
                  <label className="cmsField">
                    <span><MapPin aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> Görüşme yeri</span>
                    <textarea value={location} onChange={(event) => setLocation(event.target.value)} rows={2} maxLength={300} />
                  </label>
                )}

                {isOnline && (
                  <div className="mtTeamsBox">
                    {config.teams ? (
                      <label className="mtSwitch">
                        <input type="checkbox" checked={useTeams} onChange={(event) => setUseTeams(event.target.checked)} />
                        <span>
                          Teams toplantısını otomatik oluştur
                          <small>{config.organizer} takviminde oluşturulur; Microsoft, müşteri, katılımcılar ve RMA çalışanlarına takvim daveti gönderir.</small>
                        </span>
                      </label>
                    ) : (
                      <p className="adHint" style={{ margin: 0 }}>
                        <AlertTriangle aria-hidden="true" style={{ width: 14, height: 14, verticalAlign: '-2px' }} /> Otomatik Teams bağlantısı için Microsoft 365 bağlantısı ayarlı değil. Toplantıyı Teams’te oluşturup bağlantıyı aşağıya yapıştırın.
                      </p>
                    )}

                    {meeting.joinUrl && teamsAuto && (
                      <a className="mtTeamsLink" href={meeting.joinUrl} target="_blank" rel="noreferrer"><Video aria-hidden="true" />Mevcut Teams bağlantısı (zaman değişirse aynı toplantı güncellenir)</a>
                    )}

                    {!teamsAuto && (
                      <>
                        {deepLink && (
                          <a className="cmsButton" href={deepLink} target="_blank" rel="noreferrer">
                            <ExternalLink aria-hidden="true" />Teams’te toplantı oluştur (bilgiler dolu gelir)
                          </a>
                        )}
                        <label className="cmsField">
                          <span>Teams toplantı bağlantısı</span>
                          <input type="url" value={joinUrl} onChange={(event) => setJoinUrl(event.target.value)} placeholder="https://teams.microsoft.com/l/meetup-join/…" />
                          <small>Teams’te kaydettikten sonra “Bağlantıyı kopyala” ile alıp buraya yapıştırın. Siteden giden e-postalarda bu bağlantı ve takvim daveti yer alır.</small>
                        </label>
                      </>
                    )}
                  </div>
                )}

                <label className="cmsField">
                  <span><MessageSquareText aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> Müşteriye not <small>(isteğe bağlı, e-postada görünür)</small></span>
                  <textarea value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} rows={2} maxLength={1000} placeholder={isOnline ? 'Örn. Toplantıda ürün sunumu yapacağız.' : 'Örn. Fabrika girişinde güvenliğe adınızı söylemeniz yeterli.'} />
                </label>

                <div className="mtFormActions">
                  <button type="button" className="cmsButton cmsButtonPrimary" onClick={save} disabled={Boolean(saving)}>
                    <Send aria-hidden="true" />
                    {saving === 'confirm' ? (teamsAuto ? 'Teams toplantısı oluşturuluyor…' : 'Gönderiliyor…') : isConfirmed ? 'Kaydet ve bildir' : 'Onayla ve davet gönder'}
                  </button>
                  <button type="button" className="cmsButton cmsButtonDanger" onClick={() => setCancelOpen((value) => !value)} disabled={Boolean(saving)}>
                    <CalendarX2 aria-hidden="true" />
                    {isConfirmed ? 'İptal et' : 'Reddet'}
                  </button>
                </div>

                {cancelOpen && (
                  <div className="mtTeamsBox" style={{ borderColor: '#f3c2cb', background: '#fdf5f6' }}>
                    <label className="cmsField">
                      <span>{isConfirmed ? 'İptal nedeni (müşteriye gider)' : 'Müşteriye not (isteğe bağlı)'}</span>
                      <textarea value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} rows={2} maxLength={1000} placeholder="Örn. Önümüzdeki hafta için yeni bir zaman önermek isteriz." />
                    </label>
                    <div className="mtFormActions">
                      <button type="button" className="cmsButton cmsButtonDanger" onClick={cancel} disabled={saving === 'cancel'}>
                        {saving === 'cancel' ? 'Gönderiliyor…' : isConfirmed ? 'Toplantıyı iptal et ve bildir' : 'Talebi reddet ve bildir'}
                      </button>
                      <button type="button" className="cmsButton" onClick={() => setCancelOpen(false)}><Plus aria-hidden="true" style={{ transform: 'rotate(45deg)' }} />Vazgeç</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
