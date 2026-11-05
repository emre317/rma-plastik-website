import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Building2, CalendarCheck2, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Globe2, MailCheck, Plus,
  ShieldCheck, Trash2, UserPlus, Users, Video, X,
} from 'lucide-react';

import Arrow from '../i18n/Arrow';
import { useMeeting } from './MeetingContext';
import { submitMeeting } from '../../services/api';
import { visitAttribution } from '../../analytics/attribution';
import { track } from '../../analytics/track';
import { countryNameTr, countryOptions } from '../../data/countries';
import { dialPrefix, guessCountry, isBarePrefix } from '../../data/quoteForm';
import {
  MEETING_MAX_GUESTS, MEETING_MIN_HOURS_AHEAD, MEETING_TOPICS, istanbulDateTime, meetingDays, meetingSlots,
} from '../../data/meetingForm';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAYS_PER_PAGE = 5;
const CONTACT_KEY = 'rma_quote_contact';

const EMPTY = { company: '', name: '', email: '', phone: '', country: '', topic: '', subject: '', message: '' };

function readContact() {
  try {
    const value = JSON.parse(window.localStorage.getItem(CONTACT_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function errorKey(error) {
  if (error?.status === 0) return 'contact.errors.network';
  if (error?.status === 429) return 'contact.errors.rateLimited';
  if (error?.status === 400) return 'contact.errors.validation';
  return 'contact.errors.generic';
}

// Intl locale with Latin digits (times and dates read the same in every language)
const localeOf = (lang) => (lang === 'ar' ? 'ar-u-nu-latn' : lang === 'en' ? 'en-GB' : 'tr-TR');

const noon = (day) => new Date(`${day}T12:00:00+03:00`);

/*
  Meeting request dialog (floating contact bubble): 1. face to face or online,
  2. day and time (Türkiye time, the visitor's own time shown next to it),
  3. subject, contact details and, online, the other participants.
  The panel confirms it and e-mails the invitation (server/controllers/meetingController.js).
*/
export default function MeetingModal() {
  const { t, i18n } = useTranslation();
  const { open, type: presetType, key, closeMeeting } = useMeeting();
  const lang = i18n.resolvedLanguage || 'tr';
  const m = (name, options) => t(`meeting.${name}`, options);

  const dialogRef = useRef(null);
  const bodyRef = useRef(null);

  const [opened, setOpened] = useState(false);
  const [step, setStep] = useState(0);
  const [type, setType] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [page, setPage] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [guests, setGuests] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const [now, setNow] = useState(() => new Date());

  // Fresh dialog every time it is opened from a button
  useEffect(() => {
    if (!open) return;
    setOpened(true);
    setNow(new Date());
    setStatus('idle');
    setError('');
    setSent(null);
    setType(presetType || '');
    setStep(presetType ? 1 : 0);
    setForm((current) => {
      if (current.email) return current;
      const saved = readContact() || {};
      const country = saved.country || guessCountry(lang);
      return { ...EMPTY, ...saved, country, phone: saved.phone || dialPrefix(country) };
    });
  }, [open, key, presetType, lang]);

  // Scroll lock, Escape and focus kept in the dialog
  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => dialogRef.current?.querySelector('.mtClose')?.focus(), 60);

    function onKey(event) {
      if (event.key === 'Escape') {
        closeMeeting();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea')]
          .filter((element) => element.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
    };
  }, [open, closeMeeting]);

  // A new step starts at the top
  useEffect(() => {
    bodyRef.current?.scrollTo?.({ top: 0 });
  }, [step, status]);

  const slots = useMemo(() => meetingSlots(), []);
  const earliest = now.getTime() + MEETING_MIN_HOURS_AHEAD * 3600 * 1000;
  const isOpenSlot = (date, slot) => (istanbulDateTime(date, slot)?.getTime() || 0) >= earliest;

  // Working days with at least one free slot
  const days = useMemo(
    () => (opened ? meetingDays(now).filter((date) => slots.some((slot) => isOpenSlot(date, slot))) : []),
    [opened, now, slots]
  );
  const pages = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE));
  const visibleDays = days.slice(page * DAYS_PER_PAGE, (page + 1) * DAYS_PER_PAGE);

  const formatDay = (date, options) => new Intl.DateTimeFormat(localeOf(lang), { timeZone: 'Europe/Istanbul', ...options }).format(noon(date));

  // The visitor's own clock, when it is not Türkiye time
  const ownTime = (date, slot) => {
    const start = istanbulDateTime(date, slot);
    if (!start) return '';
    const own = new Intl.DateTimeFormat(localeOf(lang), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(start);
    return own === slot ? '' : own;
  };

  const countries = useMemo(() => (opened ? countryOptions(lang) : []), [opened, lang]);

  const setField = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      // A phone that holds only the old country code follows the country
      if (name === 'country' && isBarePrefix(current.phone)) return { ...current, country: value, phone: dialPrefix(value) };
      return { ...current, [name]: value };
    });
  };

  const selectedStart = day && time ? istanbulDateTime(day, time) : null;
  const whenText = selectedStart
    ? `${formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })} · ${time}`
    : '';

  function validate(target = step) {
    if (target >= 0 && !type) return 'meeting.errors.type';
    if (target >= 1 && (!day || !time || !isOpenSlot(day, time))) return 'meeting.errors.time';
    if (target >= 2) {
      if (!form.topic) return 'meeting.errors.topic';
      if (!form.company.trim() || !form.name.trim() || !form.email.trim() || isBarePrefix(form.phone)) return 'meeting.errors.required';
      if (!EMAIL.test(form.email.trim())) return 'meeting.errors.email';
      if (guests.some((guest) => (guest.email.trim() || guest.name.trim()) && !EMAIL.test(guest.email.trim()))) return 'meeting.errors.guest';
    }
    return '';
  }

  function next() {
    const problem = validate(step);
    setError(problem);
    if (!problem) setStep((current) => Math.min(2, current + 1));
  }

  function chooseType(value) {
    setType(value);
    setError('');
    setStep(1);
  }

  function chooseDay(value) {
    setDay(value);
    if (time && !isOpenSlot(value, time)) setTime('');
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    const problem = validate(2);
    setError(problem);
    if (problem) return;

    setStatus('sending');
    try {
      const response = await submitMeeting({
        type,
        date: day,
        time,
        topic: form.topic,
        subject: form.subject,
        message: form.message,
        company: form.company,
        name: form.name,
        email: form.email,
        phone: form.phone,
        country: form.country ? countryNameTr(form.country) : '',
        guests: type === 'online' ? guests.filter((guest) => guest.email.trim()) : [],
        language: lang,
        attribution: visitAttribution(),
      });

      track('generate_lead', { form_name: 'meeting', meeting_type: type, topic: form.topic, site_language: lang });
      setSent({ reference: response.reference || '', confirmation: Boolean(response.confirmation), email: form.email, when: whenText, type });
      setStatus('success');
      setDay('');
      setTime('');
      setGuests([]);
      setForm((current) => ({ ...current, topic: '', subject: '', message: '' }));
    } catch (err) {
      setStatus('idle');
      setError(errorKey(err));
    }
  }

  const steps = ['type', 'time', 'details'];
  const morning = slots.filter((slot) => slot < '12:00');
  const afternoon = slots.filter((slot) => slot >= '12:00');

  const slotButton = (slot) => {
    const available = day ? isOpenSlot(day, slot) : true;
    const own = day ? ownTime(day, slot) : '';
    return (
      <button
        key={slot}
        type="button"
        className={`mtSlot ${time === slot ? 'active' : ''}`}
        onClick={() => { setTime(slot); setError(''); }}
        disabled={!day || !available}
        aria-pressed={time === slot}
        title={own ? m('yourTime', { time: own }) : undefined}
      >
        <span dir="ltr">{slot}</span>
        {own && <small dir="ltr">{own}</small>}
      </button>
    );
  };

  return (
    <div className={`mtModal ${open ? 'open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="mtBackdrop" onClick={closeMeeting} />

      <div className="mtDialog" role="dialog" aria-modal="true" aria-labelledby="meeting-title" ref={dialogRef} data-track-area="meeting_dialog">
        <button type="button" className="mtClose" onClick={closeMeeting} aria-label={m('close')}>
          <X aria-hidden="true" />
        </button>

        <aside className="mtAside">
          <span className="mtAsideIcon" aria-hidden="true"><CalendarDays /></span>
          <p className="eyebrow">{m('eyebrow')}</p>
          <h2 id="meeting-title">
            {m('title')} <span>{m('titleAccent')}</span>
          </h2>
          <p className="mtAsideText">{m('text')}</p>

          <ul className="mtPoints">
            <li><CalendarCheck2 aria-hidden="true" /><span>{m('points.confirm')}</span></li>
            <li><MailCheck aria-hidden="true" /><span>{m('points.invite')}</span></li>
            <li><Video aria-hidden="true" /><span>{m('points.teams')}</span></li>
          </ul>

          {status !== 'success' && (
            <ol className="mtSteps" aria-label={m('step', { current: step + 1, total: 3 })}>
              {steps.map((name, index) => (
                <li key={name} className={index === step ? 'current' : index < step ? 'done' : ''}>
                  <span className="mtStepDot" aria-hidden="true">{index < step ? <Check /> : index + 1}</span>
                  <span>{m(`steps.${name}`)}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>

        <div className="mtMain">
          {opened && status === 'success' && sent ? (
            <div className="mtBody mtSuccess" role="status" ref={bodyRef}>
              <span className="mtSuccessIcon" aria-hidden="true">
                <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>
              </span>
              <h3>{m('success.title')}</h3>
              <p>{m('success.text')}</p>

              <div className="mtSuccessCard">
                <span className="mtTypeBadge">{sent.type === 'online' ? <Video aria-hidden="true" /> : <Building2 aria-hidden="true" />}{m(`types.${sent.type}.title`)}</span>
                <strong>{sent.when}</strong>
                <small>{m('timeZone')}</small>
              </div>

              {sent.reference && (
                <p className="mtReference">
                  <small>{m('success.reference')}</small>
                  <strong dir="ltr">{sent.reference}</strong>
                </p>
              )}
              {sent.confirmation && <p className="mtHint">{m('success.confirmation', { email: sent.email })}</p>}

              <button type="button" className="button primary" onClick={closeMeeting}>
                <span>{m('success.done')}</span>
              </button>
            </div>
          ) : opened ? (
            <form className="mtForm" onSubmit={submit} noValidate>
              <div className="mtBody" ref={bodyRef}>
                <p className="mtStepLabel">{m('step', { current: step + 1, total: 3 })}</p>

                {step === 0 && (
                  <fieldset className="mtFieldset">
                    <legend className="mtTitle">{m('typeTitle')}</legend>
                    <div className="mtTypes">
                      {[
                        { id: 'inPerson', icon: Building2 },
                        { id: 'online', icon: Video },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`mtType mtType-${option.id} ${type === option.id ? 'active' : ''}`}
                          onClick={() => chooseType(option.id)}
                          aria-pressed={type === option.id}
                        >
                          <span className="mtTypeIcon" aria-hidden="true"><option.icon /></span>
                          <strong>{m(`types.${option.id}.title`)}</strong>
                          <span>{m(`types.${option.id}.text`)}</span>
                          <span className="mtTypeCheck" aria-hidden="true"><Check /></span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}

                {step === 1 && (
                  <div className="mtTime">
                    <h3 className="mtTitle">{m('timeTitle')}</h3>

                    <div className="mtDaysHead">
                      <span className="mtLabel"><CalendarDays aria-hidden="true" />{m('dateLabel')}</span>
                      <span className="mtMonth">{visibleDays[0] ? formatDay(visibleDays[0], { month: 'long', year: 'numeric' }) : ''}</span>
                      <span className="mtPager">
                        <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} aria-label={m('prevDays')}>
                          <ChevronLeft aria-hidden="true" className="mtFlip" />
                        </button>
                        <button type="button" onClick={() => setPage((current) => Math.min(pages - 1, current + 1))} disabled={page >= pages - 1} aria-label={m('nextDays')}>
                          <ChevronRight aria-hidden="true" className="mtFlip" />
                        </button>
                      </span>
                    </div>

                    <div className="mtDays" role="group" aria-label={m('dateLabel')}>
                      {visibleDays.map((date) => (
                        <button key={date} type="button" className={`mtDay ${day === date ? 'active' : ''}`} onClick={() => chooseDay(date)} aria-pressed={day === date}>
                          <small>{formatDay(date, { weekday: 'short' })}</small>
                          <strong>{formatDay(date, { day: 'numeric' })}</strong>
                          <small>{formatDay(date, { month: 'short' })}</small>
                        </button>
                      ))}
                    </div>

                    <div className={`mtSlots ${day ? '' : 'idle'}`}>
                      <span className="mtLabel"><Clock3 aria-hidden="true" />{m('timeLabel')}</span>
                      <p className="mtSlotGroup">{m('morning')}</p>
                      <div className="mtSlotGrid">{morning.map(slotButton)}</div>
                      <p className="mtSlotGroup">{m('afternoon')}</p>
                      <div className="mtSlotGrid">{afternoon.map(slotButton)}</div>
                    </div>

                    <p className="mtHint"><Globe2 aria-hidden="true" />{m('timeZone')} {m('timeNote')}</p>
                  </div>
                )}

                {step === 2 && (
                  <div className="mtDetails">
                    <div className="mtSummary">
                      <span className="mtTypeBadge">{type === 'online' ? <Video aria-hidden="true" /> : <Building2 aria-hidden="true" />}{m(`types.${type}.title`)}</span>
                      <strong>{whenText}</strong>
                      <button type="button" className="mtTextButton" onClick={() => setStep(1)}>{m('change')}</button>
                    </div>

                    <fieldset className="mtFieldset">
                      <legend className="mtLabel">{m('topicLabel')} *</legend>
                      <div className="mtChips">
                        {MEETING_TOPICS.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            className={`mtChip ${form.topic === topic ? 'active' : ''}`}
                            onClick={() => { setForm((current) => ({ ...current, topic })); setError(''); }}
                            aria-pressed={form.topic === topic}
                          >
                            {m(`topics.${topic}`)}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <label className="mtField mtWide">
                      <span>{m('subjectLabel')} <small>({m('optional')})</small></span>
                      <input name="subject" value={form.subject} onChange={setField} maxLength={200} placeholder={m('subjectPlaceholder')} />
                    </label>

                    <div className="mtGrid">
                      <label className="mtField">
                        <span>{m('company')} *</span>
                        <input name="company" value={form.company} onChange={setField} maxLength={150} autoComplete="organization" required />
                      </label>
                      <label className="mtField">
                        <span>{m('name')} *</span>
                        <input name="name" value={form.name} onChange={setField} maxLength={120} autoComplete="name" required />
                      </label>
                      <label className="mtField">
                        <span>{m('email')} *</span>
                        <input name="email" type="email" value={form.email} onChange={setField} maxLength={254} autoComplete="email" dir="ltr" required />
                      </label>
                      <label className="mtField">
                        <span>{m('phone')} *</span>
                        <input name="phone" type="tel" value={form.phone} onChange={setField} maxLength={40} autoComplete="tel" dir="ltr" required />
                      </label>
                      <label className="mtField mtWide">
                        <span>{m('country')} <small>({m('optional')})</small></span>
                        <select name="country" value={form.country} onChange={setField}>
                          <option value="">{m('countryPlaceholder')}</option>
                          {countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                        </select>
                      </label>
                    </div>

                    {type === 'online' && (
                      <div className="mtGuests">
                        <div className="mtGuestsHead">
                          <span className="mtLabel"><Users aria-hidden="true" />{m('guestsTitle')} <small>({m('optional')})</small></span>
                          <small>{m('guestsText')}</small>
                        </div>
                        {guests.map((guest, index) => (
                          <div className="mtGuest" key={index}>
                            <input
                              value={guest.name}
                              onChange={(event) => setGuests((list) => list.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))}
                              placeholder={m('guestName')}
                              aria-label={`${m('guestName')} ${index + 1}`}
                              maxLength={120}
                            />
                            <input
                              type="email"
                              dir="ltr"
                              value={guest.email}
                              onChange={(event) => setGuests((list) => list.map((item, i) => (i === index ? { ...item, email: event.target.value } : item)))}
                              placeholder={m('guestEmail')}
                              aria-label={`${m('guestEmail')} ${index + 1}`}
                              maxLength={254}
                            />
                            <button type="button" className="mtIconButton" onClick={() => setGuests((list) => list.filter((_, i) => i !== index))} aria-label={m('removeGuest')}>
                              <Trash2 aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                        {guests.length < MEETING_MAX_GUESTS && (
                          <button type="button" className="mtAddGuest" onClick={() => setGuests((list) => [...list, { name: '', email: '' }])}>
                            {guests.length ? <Plus aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
                            {m('addGuest')}
                          </button>
                        )}
                      </div>
                    )}

                    <label className="mtField mtWide">
                      <span>{m('messageLabel')} <small>({m('optional')})</small></span>
                      <textarea name="message" value={form.message} onChange={setField} maxLength={2000} rows={3} placeholder={m('messagePlaceholder')} />
                    </label>

                    <p className="mtPrivacy">
                      <ShieldCheck aria-hidden="true" />
                      <span>
                        {m('privacy.before')}
                        <a href={`/${lang}/kvkk`} target="_blank" rel="noopener noreferrer">{m('privacy.link')}</a>
                        {m('privacy.after')}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <div className="mtFooter">
                {error && <p className="mtError" role="alert">{t(error)}</p>}
                <div className="mtActions">
                  {step > 0 ? (
                    <button type="button" className="mtBack" onClick={() => { setError(''); setStep((current) => current - 1); }}>
                      <ArrowLeft aria-hidden="true" className="mtFlip" />
                      {m('back')}
                    </button>
                  ) : <span />}

                  {step === 1 && (
                    <button type="button" className="button primary" onClick={next} disabled={!day || !time}>
                      <span>{m('next')}</span>
                      <Arrow className="buttonArrow" />
                    </button>
                  )}
                  {step === 2 && (
                    <button type="submit" className="button primary" disabled={status === 'sending'}>
                      <span>{status === 'sending' ? m('sending') : m('submit')}</span>
                      {status !== 'sending' && <CalendarCheck2 aria-hidden="true" className="buttonIcon" />}
                    </button>
                  )}
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
