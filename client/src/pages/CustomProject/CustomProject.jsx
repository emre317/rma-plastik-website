import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightLeft, Box, Check, ClipboardCheck, CloudUpload, DraftingCompass, FileArchive, FileBox, FileImage, FileText, Forklift,
  Lightbulb, Lock, Mail, Package, Pencil, Phone, RotateCcw, Send, Shapes, Sparkles, Tractor, Trash2, Trees, Waves,
  Cylinder, X,
} from 'lucide-react';

import Seo from '../../seo/Seo';
import PageHeader from '../../components/ui/PageHeader';
import Dropdown from '../../components/ui/Dropdown';
import Arrow from '../../components/i18n/Arrow';
import { LocalizedLink } from '../../components/i18n/LocalizedLink';
import company from '../../data/company';
import useLanguage from '../../hooks/useLanguage';
import { countryNameTr, countryOptions } from '../../data/countries';
import { TR_PROVINCES, dialPrefix, guessCountry, isBarePrefix } from '../../data/quoteForm';
import {
  PROJECT_COLOURS, PROJECT_CONDITIONS, PROJECT_FEATURES, PROJECT_FILE_TYPES, PROJECT_MATERIALS, PROJECT_MAX_FILES,
  PROJECT_MAX_FILE_MB, PROJECT_STAGES, PROJECT_TIMELINES, PROJECT_TYPES, PROJECT_VOLUMES,
} from '../../data/projectBrief';
import { submitProject } from '../../services/api';
import { visitAttribution } from '../../analytics/attribution';
import { track } from '../../analytics/track';
import { clearUserData, hashedUserData } from '../../analytics/userData';
import ConsentBoxes, { EMPTY_CONSENTS } from '../../components/forms/ConsentBoxes';

const STEPS = ['project', 'specs', 'volume', 'files', 'contact'];

const TYPE_ICONS = { tank: Cylinder, housing: Box, logistics: Forklift, floating: Waves, outdoor: Trees, vehicle: Tractor, other: Shapes };
const STAGE_ICONS = { new: Sparkles, existing: RotateCcw, convert: ArrowRightLeft };
const INPUT_ICONS = { drawing: DraftingCompass, sample: Package, idea: Lightbulb };
const DESIGN_INPUTS = ['drawing', 'sample', 'idea'];

const DRAFT_KEY = 'rma_project_draft_v1';
const CONTACT_KEY = 'rma_quote_contact';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyForm = {
  type: '', stage: '', designInput: '', title: '', description: '',
  length: '', width: '', height: '', volume: '', weight: '', wall: '',
  material: '', method: '', colour: '', colourNote: '', conditions: [], features: [],
  annualVolume: '', firstOrder: '', prototype: false, timeline: '',
  notes: '', nda: false,
  company: '', name: '', email: '', phone: '', country: '', deliveryCity: '',
};

// Contact details are never kept in the draft on the device (KVKK: only with the
// quote form's own "remember me" choice); the draft holds the project only
const CONTACT_FIELDS = ['company', 'name', 'email', 'phone', 'country', 'deliveryCity'];
const withoutContact = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => !CONTACT_FIELDS.includes(key)));

const readJson = (key) => {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
};

const writeDraft = (value) => {
  try {
    if (value) window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...value, savedAt: Date.now() }));
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage blocked: the brief lives for this visit only
  }
};

const extensionOf = (name) => String(name).split('.').pop().toLowerCase();

const fileSize = (bytes, lang) => {
  const format = (value, digits) => value.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', { maximumFractionDigits: digits });
  return bytes >= 1024 * 1024 ? `${format(bytes / 1024 / 1024, 1)} MB` : `${format(Math.max(1, bytes / 1024), 0)} KB`;
};

function FileIcon({ name }) {
  const extension = extensionOf(name);
  const Icon = ['jpg', 'jpeg', 'png', 'webp'].includes(extension)
    ? FileImage
    : extension === 'zip'
      ? FileArchive
      : ['step', 'stp', 'iges', 'igs', 'stl', 'dxf', 'dwg'].includes(extension) ? FileBox : FileText;
  return <Icon aria-hidden="true" />;
}

/* Big selectable card (radio or checkbox) with an icon, a title and a line of text */
function ChoiceCard({ type = 'radio', name, value, checked, onChange, icon: Icon, title, text, compact = false }) {
  return (
    <label className={`cpChoice ${checked ? 'checked' : ''} ${compact ? 'compact' : ''}`}>
      <input type={type} name={name} value={value} checked={checked} onChange={onChange} />
      {Icon && <span className="cpChoiceIcon" aria-hidden="true"><Icon /></span>}
      <span className="cpChoiceText">
        <strong>{title}</strong>
        {text && <small>{text}</small>}
      </span>
      <span className="cpChoiceMark" aria-hidden="true"><Check /></span>
    </label>
  );
}

/* Pill toggles for short choices */
function Pills({ type = 'radio', name, options, value, onToggle, label }) {
  const isChecked = (key) => (Array.isArray(value) ? value.includes(key) : value === key);

  return (
    <div className="cpPills" role={type === 'radio' ? 'radiogroup' : 'group'} aria-label={label}>
      {options.map((option) => (
        <label key={option.value} className={`cpPill ${isChecked(option.value) ? 'checked' : ''}`}>
          <input type={type} name={name} value={option.value} checked={isChecked(option.value)} onChange={() => onToggle(option.value)} />
          {type === 'checkbox' && <span className="cpPillTick" aria-hidden="true"><Check /></span>}
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function Field({ label, hint, optional, error, children, className = '', htmlFor }) {
  const { t } = useTranslation();

  return (
    <div className={`cpField ${error ? 'invalid' : ''} ${className}`}>
      <span className="cpLabel">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
        {optional && <small>{t('contact.optional')}</small>}
      </span>
      {children}
      {error ? <p className="cpError" role="alert">{error}</p> : hint ? <p className="cpHint">{hint}</p> : null}
    </div>
  );
}

function UnitInput({ id, value, onChange, unit, placeholder, max }) {
  return (
    <span className="cpUnit">
      <input id={id} type="text" inputMode="decimal" value={value} onChange={onChange} placeholder={placeholder} maxLength={max || 9} autoComplete="off" />
      <em aria-hidden="true">{unit}</em>
    </span>
  );
}

/*
  Custom project wizard (/custom-molding/project): five short steps, a live
  summary, drawings by drag and drop, and a draft kept on this device. The
  brief is saved as a quote request (source "project") with its files.
*/
export default function CustomProject() {
  const { t, i18n } = useTranslation();
  const trT = i18n.getFixedT('tr');
  const { code: lang } = useLanguage();
  const uid = useId();
  const p = (key, options) => t(`project.${key}`, options);
  const list = (key) => {
    const value = t(key, { returnObjects: true });
    return Array.isArray(value) ? value : [];
  };

  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [fileNotes, setFileNotes] = useState([]);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(null);
  const [restored, setRestored] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  // KVKK boxes A, B (e-mail / SMS / call) and C: unticked, never required
  const [consents, setConsents] = useState(EMPTY_CONSENTS);

  const cardRef = useRef(null);
  const fileInputRef = useRef(null);
  const started = useRef(false);

  const methods = list('pages.customMolding.methods');
  const methodsTr = (() => {
    const value = trT('pages.customMolding.methods', { returnObjects: true });
    return Array.isArray(value) ? value : [];
  })();
  const figures = list('customMolding.figures');
  const processItems = list('project.process.items');
  const countries = useMemo(() => countryOptions(lang), [lang]);

  // Draft (or remembered contact details) after hydration; the guessed country with its dial code
  useEffect(() => {
    const draft = readJson(DRAFT_KEY);
    const contact = readJson(CONTACT_KEY);

    setForm((current) => {
      let next = { ...current };
      if (draft) {
        Object.keys(emptyForm).forEach((key) => {
          if (draft[key] === undefined || CONTACT_FIELDS.includes(key)) return;
          next[key] = Array.isArray(emptyForm[key]) ? (Array.isArray(draft[key]) ? draft[key] : []) : typeof emptyForm[key] === 'boolean' ? draft[key] === true : String(draft[key]).slice(0, 1500);
        });
      }
      if (contact) ['company', 'name', 'email', 'phone', 'country'].forEach((key) => { if (!next[key] && contact[key]) next[key] = String(contact[key]).slice(0, 150); });
      if (!next.country) next.country = guessCountry(lang);
      if (isBarePrefix(next.phone) && dialPrefix(next.country)) next.phone = dialPrefix(next.country);
      return next;
    });

    if (draft && (draft.type || draft.description)) {
      setRestored(true);
      const resumeAt = Math.min(Math.max(0, Number(draft.step) || 0), STEPS.length - 1);
      setStep(resumeAt);
      setReached(Math.max(resumeAt, Number(draft.reached) || 0));
    }
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The confirmation comes into view once the brief is sent
  useEffect(() => {
    if (status !== 'success') return;
    const card = document.querySelector('.cpSuccess');
    if (!card) return;
    const top = card.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    card.querySelector('h2')?.focus?.({ preventScroll: true });
  }, [status]);

  // The brief is kept on this device while it is filled in (not the files)
  useEffect(() => {
    if (!ready || status === 'success') return undefined;
    const timer = setTimeout(() => {
      const meaningful = form.type || form.description || form.title;
      writeDraft(meaningful ? { ...withoutContact(form), step, reached } : null);
    }, 400);
    return () => clearTimeout(timer);
  }, [form, step, reached, ready, status]);

  const set = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: '' }));
    if (!started.current) {
      started.current = true;
      track('project_wizard_start', { site_language: lang });
    }
  };
  const onInput = (name) => (event) => set(name, event.target.value);
  const onNumber = (name) => (event) => set(name, event.target.value.replace(/[^\d.,]/g, '').slice(0, 9));
  const toggle = (name, key) => set(name, form[name].includes(key) ? form[name].filter((item) => item !== key) : [...form[name], key]);

  function chooseCountry(code) {
    setForm((current) => ({
      ...current,
      country: code,
      phone: isBarePrefix(current.phone) ? dialPrefix(code) || current.phone : current.phone,
      deliveryCity: current.country === 'TR' && code !== 'TR' && TR_PROVINCES.includes(current.deliveryCity) ? '' : current.deliveryCity,
    }));
  }

  /* ---------- Files ---------- */

  function addFiles(list) {
    const notes = [];
    const next = [...files];

    [...list].forEach((file) => {
      const extension = extensionOf(file.name);
      if (!PROJECT_FILE_TYPES.includes(extension)) {
        notes.push(p('files.errors.type', { name: file.name }));
      } else if (file.size > PROJECT_MAX_FILE_MB * 1024 * 1024) {
        notes.push(p('files.errors.size', { name: file.name, size: PROJECT_MAX_FILE_MB }));
      } else if (next.some((item) => item.name === file.name && item.size === file.size)) {
        notes.push(p('files.errors.duplicate', { name: file.name }));
      } else if (next.length >= PROJECT_MAX_FILES) {
        if (!notes.includes(p('files.errors.count', { count: PROJECT_MAX_FILES }))) notes.push(p('files.errors.count', { count: PROJECT_MAX_FILES }));
      } else {
        next.push(file);
      }
    });

    setFiles(next);
    setFileNotes(notes);
    if (next.length > files.length) track('project_wizard_files', { files: next.length });
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
  }

  /* ---------- Steps ---------- */

  function validate(index) {
    const problems = {};
    const key = STEPS[index];

    if (key === 'project') {
      if (!form.type) problems.type = p('errors.type');
      if (form.description.trim().length < 10) problems.description = p('errors.description');
    }

    if (key === 'contact') {
      if (!form.company.trim()) problems.company = p('errors.required');
      if (!form.name.trim()) problems.name = p('errors.required');
      if (!EMAIL_PATTERN.test(form.email.trim())) problems.email = p('errors.email');
      if (form.phone.replace(/\D/g, '').length < 7 || isBarePrefix(form.phone)) problems.phone = p('errors.phone');
    }

    return problems;
  }

  function focusFirstError(problems) {
    const first = Object.keys(problems)[0];
    if (!first) return;
    setTimeout(() => {
      const element = cardRef.current?.querySelector(`[data-field="${first}"] input, [data-field="${first}"] textarea, [data-field="${first}"] button`);
      element?.focus({ preventScroll: true });
      element?.closest('[data-field]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 30);
  }

  function goTo(index) {
    setStep(index);
    setReached((current) => Math.max(current, index));
    setFeedback('');
    // The step heading comes into view (the page is long on phones)
    requestAnimationFrame(() => {
      const top = (cardRef.current?.getBoundingClientRect().top || 0) + window.scrollY - 110;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
      cardRef.current?.querySelector('.cpStepHead h2')?.focus({ preventScroll: true });
    });
  }

  function next() {
    const problems = validate(step);
    setErrors(problems);
    if (Object.keys(problems).length) {
      focusFirstError(problems);
      return;
    }
    track('project_wizard_step', { step: step + 2, step_name: STEPS[step + 1] });
    goTo(step + 1);
  }

  function jump(index) {
    if (index > reached || index === step) return;
    // Moving forward again needs the steps in between to be fine
    for (let i = 0; i < index; i += 1) {
      const problems = validate(i);
      if (Object.keys(problems).length) {
        setErrors(problems);
        goTo(i);
        focusFirstError(problems);
        return;
      }
    }
    goTo(index);
  }

  function restart() {
    writeDraft(null);
    setForm((current) => ({ ...emptyForm, company: current.company, name: current.name, email: current.email, phone: current.phone, country: current.country }));
    setFiles([]);
    setFileNotes([]);
    setErrors({});
    setRestored(false);
    setStep(0);
    setReached(0);
  }

  async function submit(event) {
    event.preventDefault();

    // Every step is checked again; the first one with a problem opens
    for (let i = 0; i < STEPS.length; i += 1) {
      const problems = validate(i);
      if (Object.keys(problems).length) {
        setErrors(problems);
        if (i !== step) goTo(i);
        focusFirstError(problems);
        return;
      }
    }

    setStatus('loading');
    setFeedback('');

    const methodIndex = methods.indexOf(form.method);
    const payload = {
      company: form.company.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      phone: isBarePrefix(form.phone) ? '' : form.phone.trim(),
      country: form.country ? countryNameTr(form.country) : '',
      deliveryCity: form.deliveryCity.trim(),
      language: lang,
      attribution: visitAttribution(),
      designInput: form.designInput,
      firstOrder: form.firstOrder,
      consents,
      notes: form.notes.trim(),
      project: {
        type: form.type,
        stage: form.stage,
        title: form.title.trim(),
        description: form.description.trim(),
        length: form.length, width: form.width, height: form.height,
        volume: form.volume, weight: form.weight, wall: form.wall,
        material: form.material,
        // The sales team reads the method in Turkish
        method: form.method === 'advice' ? trT('project.materials.advice') : methodIndex >= 0 ? methodsTr[methodIndex] || form.method : '',
        colour: form.colour,
        colourNote: form.colour === 'custom' ? form.colourNote.trim() : '',
        conditions: form.conditions,
        features: form.features,
        annualVolume: form.annualVolume,
        needsPrototype: form.prototype,
        timeline: form.timeline,
        nda: form.nda,
      },
    };

    try {
      const response = await submitProject(payload, files);
      setStatus('success');
      setSent({ email: payload.email, reference: response?.reference || '', confirmation: Boolean(response?.confirmation), files: files.length });
      writeDraft(null);
      setConsents(EMPTY_CONSENTS);

      // Counted as a quote request in Google Ads ("Teklif Talebi" fires on form_name = quote);
      // `product` tells project briefs apart in GA4. With marketing consent it carries
      // the hashed e-mail and phone for enhanced conversions (analytics/userData.js).
      const userData = await hashedUserData({ email: payload.email, phone: payload.phone, matchingConsent: consents.c });
      track('generate_lead', {
        form_name: 'quote',
        product: `custom_project:${form.type}`,
        files: files.length,
        country: form.country || '(not set)',
        site_language: lang,
        ...(userData ? { user_data: userData } : {}),
      });
      if (userData) clearUserData();

    } catch (error) {
      setStatus('error');
      const key = error?.status === 0 ? 'network' : error?.status === 429 ? 'rateLimited' : error?.status === 400 ? 'validation' : 'generic';
      setFeedback(error?.status === 400 && error.message && /file|MB|valid/i.test(error.message) ? p('errors.files') : t(`contact.errors.${key}`));
    }
  }

  /* ---------- Summary ---------- */

  const size = [form.length, form.width, form.height].filter(Boolean);
  const summary = [
    { step: 0, label: p('fields.type'), value: form.type ? p(`types.${form.type}.title`) : '' },
    { step: 0, label: p('fields.stage'), value: form.stage ? p(`stages.${form.stage}.title`) : '' },
    { step: 0, label: p('fields.designInput'), value: form.designInput ? p(`designInputs.${form.designInput}.title`) : '' },
    { step: 1, label: p('summary.size'), value: size.length ? `${size.join(' × ')} mm` : '', ltr: true },
    { step: 1, label: p('fields.material'), value: form.material ? p(`materials.${form.material}`) : '' },
    { step: 1, label: p('fields.method'), value: form.method === 'advice' ? p('materials.advice') : form.method },
    { step: 1, label: p('fields.conditions'), value: form.conditions.map((key) => p(`conditions.${key}`)).join(', ') },
    { step: 2, label: p('fields.annualVolume'), value: form.annualVolume ? `${p(`volumes.${form.annualVolume}`)}${form.annualVolume === 'unknown' ? '' : ` ${p('volumesUnit')}`}` : '' },
    { step: 2, label: p('fields.timeline'), value: form.timeline ? p(`timelines.${form.timeline}`) : '' },
    { step: 3, label: p('fields.files'), value: files.length ? p('summary.files', { count: files.length }) : '' },
  ];
  const filled = [form.type, form.description.trim().length >= 10, form.material || size.length || form.conditions.length, form.annualVolume || form.timeline, files.length || form.notes, form.company && form.email].filter(Boolean).length;
  const progress = Math.round((filled / 6) * 100);

  const pageTitle = p('meta.title');
  const head = (
    <Seo
      title={pageTitle}
      description={p('meta.description')}
      breadcrumbs={[{ name: t('meta.titles.customMolding'), path: '/custom-molding' }, { name: pageTitle, path: '/custom-molding/project' }]}
    />
  );

  const header = (
    <PageHeader
      compact
      className="cpHeader"
      crumbs={[{ label: t('nav.customMolding'), to: '/custom-molding' }, { label: p('crumb') }]}
      eyebrow={p('eyebrow')}
      title={p('title')}
      accent={p('titleAccent')}
      lead={p('lead')}
      facts={figures.map((figure) => ({ value: figure.value, label: figure.label }))}
      side={(
        <ol className="cpProcess" aria-label={p('process.label')}>
          {processItems.map((item, index) => (
            <li key={item.title}>
              <span className="cpProcessIndex">{String(index + 1).padStart(2, '0')}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
            </li>
          ))}
        </ol>
      )}
    />
  );

  /* ---------- Success ---------- */

  if (status === 'success' && sent) {
    return (
      <main className="internalPage cpPage">
        {head}
        {header}
        <section className="cpWizard">
          <div className="container">
            <div className="cpSuccess" role="status">
              <span className="cpSuccessIcon" aria-hidden="true">
                <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg>
              </span>
              <p className="eyebrow">{p('success.eyebrow')}</p>
              <h2 tabIndex={-1}>{p('success.title')}</h2>
              <p className="cpSuccessText">{p('success.text', { email: sent.email })}</p>

              {sent.reference && (
                <p className="cpReference">
                  <span>{p('success.reference')}</span>
                  <strong dir="ltr">{sent.reference}</strong>
                </p>
              )}
              {sent.confirmation && <p className="cpMailNote"><Mail aria-hidden="true" />{p('success.mail', { email: sent.email })}</p>}

              <ol className="cpNextSteps">
                {list('project.success.steps').map((text, index) => (
                  <li key={text}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    {text}
                  </li>
                ))}
              </ol>

              <div className="cpSuccessActions">
                <LocalizedLink to="/custom-molding" className="button primary">
                  <span>{p('success.references')}</span>
                  <Arrow className="buttonArrow" />
                </LocalizedLink>
                <LocalizedLink to="/products" className="button ghost">
                  <span>{p('success.products')}</span>
                </LocalizedLink>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* ---------- Wizard ---------- */

  const stepKey = STEPS[step];
  const last = step === STEPS.length - 1;
  const id = (name) => `${uid}-${name}`;

  return (
    <main className="internalPage cpPage">
      {head}
      {header}

      <section className="cpWizard" aria-label={p('eyebrow')}>
        <div className="container cpLayout">
          <div className="cpMain">
            {/* Stepper */}
            <nav className="cpStepper" aria-label={p('stepsLabel')}>
              <div className="cpStepperBar" aria-hidden="true"><span style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} /></div>
              <ol>
                {STEPS.map((key, index) => {
                  const state = index === step ? 'current' : index < step || index <= reached ? 'done' : 'todo';
                  return (
                    <li key={key} className={`cpStep ${state}`}>
                      <button
                        type="button"
                        onClick={() => jump(index)}
                        disabled={index > reached}
                        aria-current={index === step ? 'step' : undefined}
                      >
                        <span className="cpStepDot">{index < step ? <Check aria-hidden="true" /> : index + 1}</span>
                        <span className="cpStepLabel">{p(`steps.${key}`)}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <form className="cpCard" ref={cardRef} onSubmit={last ? submit : (event) => { event.preventDefault(); next(); }} noValidate>
              {restored && step === 0 && (
                <div className="cpRestored" role="status">
                  <RotateCcw aria-hidden="true" />
                  <span>{p('nav.draftRestored')}</span>
                  <button type="button" onClick={restart}>{p('nav.restart')}</button>
                </div>
              )}

              <header className="cpStepHead">
                <span className="cpStepCount">{p('stepOf', { current: step + 1, total: STEPS.length })}</span>
                <h2 tabIndex={-1}>{p(`stepHeads.${stepKey}.title`)}</h2>
                <p>{p(`stepHeads.${stepKey}.lead`)}</p>
              </header>

              {/* 1 · Project */}
              {stepKey === 'project' && (
                <div className="cpStepBody">
                  <Field label={`${p('fields.type')} *`} error={errors.type}>
                    <div className="cpChoices cpChoicesTypes" role="radiogroup" aria-label={p('fields.type')} data-field="type">
                      {PROJECT_TYPES.map((key) => (
                        <ChoiceCard
                          key={key}
                          name="type"
                          value={key}
                          checked={form.type === key}
                          onChange={() => set('type', key)}
                          icon={TYPE_ICONS[key]}
                          title={p(`types.${key}.title`)}
                          text={p(`types.${key}.text`)}
                        />
                      ))}
                    </div>
                  </Field>

                  <div className="cpGrid2">
                    <Field label={p('fields.title')} optional htmlFor={id('title')}>
                      <input id={id('title')} type="text" maxLength={120} value={form.title} onChange={onInput('title')} placeholder={p('placeholders.title')} />
                    </Field>
                    <Field label={p('fields.stage')} optional>
                      <Pills
                        name="stage"
                        label={p('fields.stage')}
                        value={form.stage}
                        onToggle={(key) => set('stage', form.stage === key ? '' : key)}
                        options={PROJECT_STAGES.map((key) => ({ value: key, label: p(`stages.${key}.title`) }))}
                      />
                    </Field>
                  </div>

                  <Field label={`${p('fields.description')} *`} hint={p('hints.description')} error={errors.description} htmlFor={id('description')}>
                    <span data-field="description" className="cpTextarea">
                      <textarea
                        id={id('description')}
                        rows="4"
                        maxLength={1500}
                        value={form.description}
                        onChange={onInput('description')}
                        placeholder={p('placeholders.description')}
                        aria-invalid={Boolean(errors.description)}
                      />
                      <em aria-hidden="true">{form.description.length} / 1500</em>
                    </span>
                  </Field>

                  <Field label={p('fields.designInput')} optional>
                    <div className="cpChoices cpChoicesThree" role="radiogroup" aria-label={p('fields.designInput')}>
                      {DESIGN_INPUTS.map((key) => (
                        <ChoiceCard
                          key={key}
                          compact
                          name="designInput"
                          value={key}
                          checked={form.designInput === key}
                          onChange={() => set('designInput', key)}
                          icon={INPUT_ICONS[key]}
                          title={p(`designInputs.${key}.title`)}
                          text={p(`designInputs.${key}.text`)}
                        />
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {/* 2 · Specs */}
              {stepKey === 'specs' && (
                <div className="cpStepBody">
                  <Field label={p('fields.size')} hint={p('hints.size')} optional>
                    <div className="cpSizes">
                      {['length', 'width', 'height'].map((key, index) => (
                        <div key={key} className="cpSize">
                          <label htmlFor={id(key)}>{p(`fields.${key}`)}</label>
                          <UnitInput id={id(key)} value={form[key]} onChange={onNumber(key)} unit="mm" placeholder={['1200', '800', '600'][index]} />
                        </div>
                      ))}
                    </div>
                  </Field>

                  <div className="cpGrid3">
                    <Field label={p('fields.volume')} optional htmlFor={id('volume')}>
                      <UnitInput id={id('volume')} value={form.volume} onChange={onNumber('volume')} unit="L" placeholder="500" />
                    </Field>
                    <Field label={p('fields.weight')} optional htmlFor={id('weight')}>
                      <UnitInput id={id('weight')} value={form.weight} onChange={onNumber('weight')} unit="kg" placeholder="15" />
                    </Field>
                    <Field label={p('fields.wall')} optional htmlFor={id('wall')}>
                      <UnitInput id={id('wall')} value={form.wall} onChange={onNumber('wall')} unit="mm" placeholder="6" max={5} />
                    </Field>
                  </div>

                  <div className="cpGrid2">
                    <Field label={p('fields.material')} optional>
                      <Pills
                        name="material"
                        label={p('fields.material')}
                        value={form.material}
                        onToggle={(key) => set('material', form.material === key ? '' : key)}
                        options={PROJECT_MATERIALS.map((key) => ({ value: key, label: p(`materials.${key}`) }))}
                      />
                    </Field>
                    <Field label={p('fields.method')} optional>
                      <Dropdown
                        value={form.method}
                        onChange={(value) => set('method', value)}
                        options={[...methods.map((method) => ({ value: method, label: method })), { value: 'advice', label: p('materials.advice') }]}
                        placeholder={p('placeholders.method')}
                        label={p('fields.method')}
                      />
                    </Field>
                  </div>

                  <div className="cpGrid2">
                    <Field label={p('fields.colour')} optional>
                      <Pills
                        name="colour"
                        label={p('fields.colour')}
                        value={form.colour}
                        onToggle={(key) => set('colour', form.colour === key ? '' : key)}
                        options={PROJECT_COLOURS.map((key) => ({ value: key, label: p(`colours.${key}`) }))}
                      />
                    </Field>
                    {form.colour === 'custom' && (
                      <Field label={p('fields.colourNote')} optional htmlFor={id('colourNote')}>
                        <input id={id('colourNote')} type="text" maxLength={80} value={form.colourNote} onChange={onInput('colourNote')} placeholder={p('placeholders.colourNote')} />
                      </Field>
                    )}
                  </div>

                  <Field label={p('fields.conditions')} optional>
                    <Pills
                      type="checkbox"
                      name="conditions"
                      label={p('fields.conditions')}
                      value={form.conditions}
                      onToggle={(key) => toggle('conditions', key)}
                      options={PROJECT_CONDITIONS.map((key) => ({ value: key, label: p(`conditions.${key}`) }))}
                    />
                  </Field>

                  <Field label={p('fields.features')} optional>
                    <Pills
                      type="checkbox"
                      name="features"
                      label={p('fields.features')}
                      value={form.features}
                      onToggle={(key) => toggle('features', key)}
                      options={PROJECT_FEATURES.map((key) => ({ value: key, label: p(`features.${key}`) }))}
                    />
                  </Field>
                </div>
              )}

              {/* 3 · Quantities and timing */}
              {stepKey === 'volume' && (
                <div className="cpStepBody">
                  <Field label={p('fields.annualVolume')} optional>
                    <div className="cpVolumes" role="radiogroup" aria-label={p('fields.annualVolume')}>
                      {PROJECT_VOLUMES.map((key) => (
                        <label key={key} className={`cpVolume ${form.annualVolume === key ? 'checked' : ''}`}>
                          <input type="radio" name="annualVolume" value={key} checked={form.annualVolume === key} onChange={() => set('annualVolume', key)} />
                          <strong dir="ltr">{p(`volumes.${key}`)}</strong>
                          {key !== 'unknown' && <small>{p('volumesUnit')}</small>}
                        </label>
                      ))}
                    </div>
                  </Field>

                  <div className="cpGrid2">
                    <Field label={p('fields.firstOrder')} optional htmlFor={id('firstOrder')}>
                      <UnitInput id={id('firstOrder')} value={form.firstOrder} onChange={(event) => set('firstOrder', event.target.value.replace(/\D/g, '').slice(0, 8))} unit={p('pieces')} placeholder={p('placeholders.firstOrder')} max={8} />
                    </Field>
                    <Field label={p('fields.prototypeLabel')} optional>
                      <label className={`cpSwitch ${form.prototype ? 'checked' : ''}`}>
                        <input type="checkbox" checked={form.prototype} onChange={(event) => set('prototype', event.target.checked)} />
                        <span className="cpSwitchTrack" aria-hidden="true"><span /></span>
                        <span>{p('fields.prototype')}</span>
                      </label>
                    </Field>
                  </div>

                  <Field label={p('fields.timeline')} optional>
                    <Pills
                      name="timeline"
                      label={p('fields.timeline')}
                      value={form.timeline}
                      onToggle={(key) => set('timeline', form.timeline === key ? '' : key)}
                      options={PROJECT_TIMELINES.map((key) => ({ value: key, label: p(`timelines.${key}`) }))}
                    />
                  </Field>
                </div>
              )}

              {/* 4 · Files */}
              {stepKey === 'files' && (
                <div className="cpStepBody">
                  <div
                    className={`cpDrop ${dragging ? 'dragging' : ''} ${files.length >= PROJECT_MAX_FILES ? 'full' : ''}`}
                    onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
                    onDrop={onDrop}
                  >
                    <span className="cpDropIcon" aria-hidden="true"><CloudUpload /></span>
                    <strong>{p('files.drop')}</strong>
                    <span className="cpDropOr">
                      {p('files.or')}{' '}
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={files.length >= PROJECT_MAX_FILES}>
                        {p('files.browse')}
                      </button>
                    </span>
                    <small>{p('files.types')}</small>
                    <small>{p('files.limits', { count: PROJECT_MAX_FILES, size: PROJECT_MAX_FILE_MB })}</small>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      hidden
                      accept={PROJECT_FILE_TYPES.map((extension) => `.${extension}`).join(',')}
                      onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}
                    />
                  </div>

                  {fileNotes.length > 0 && (
                    <ul className="cpFileNotes" role="alert">
                      {fileNotes.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  )}

                  {files.length > 0 && (
                    <ul className="cpFiles">
                      {files.map((file) => (
                        <li key={`${file.name}-${file.size}`}>
                          <span className="cpFileIcon"><FileIcon name={file.name} /><em>{extensionOf(file.name)}</em></span>
                          <span className="cpFileName">
                            <strong dir="auto">{file.name}</strong>
                            <small>{fileSize(file.size, lang)}</small>
                          </span>
                          <button
                            type="button"
                            className="cpFileRemove"
                            onClick={() => setFiles(files.filter((item) => item !== file))}
                            aria-label={`${p('files.remove')}: ${file.name}`}
                          >
                            <Trash2 aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="cpPrivacy"><Lock aria-hidden="true" />{p('files.privacy')}</p>

                  <Field label={p('fields.notes')} optional htmlFor={id('notes')}>
                    <textarea id={id('notes')} rows="3" maxLength={5000} value={form.notes} onChange={onInput('notes')} placeholder={p('placeholders.notes')} />
                  </Field>

                  <label className={`cpCheck ${form.nda ? 'checked' : ''}`}>
                    <input type="checkbox" checked={form.nda} onChange={(event) => set('nda', event.target.checked)} />
                    <span className="cpCheckBox" aria-hidden="true"><Check /></span>
                    <span>
                      <strong>{p('fields.nda')}</strong>
                      <small>{p('hints.nda')}</small>
                    </span>
                  </label>
                </div>
              )}

              {/* 5 · Contact */}
              {stepKey === 'contact' && (
                <div className="cpStepBody">
                  <div className="cpGrid2">
                    <Field label={`${t('contact.fields.company')} *`} error={errors.company} htmlFor={id('company')}>
                      <span data-field="company"><input id={id('company')} type="text" maxLength={150} autoComplete="organization" value={form.company} onChange={onInput('company')} placeholder={t('contact.placeholders.company')} aria-invalid={Boolean(errors.company)} /></span>
                    </Field>
                    <Field label={`${t('contact.fields.name')} *`} error={errors.name} htmlFor={id('name')}>
                      <span data-field="name"><input id={id('name')} type="text" maxLength={120} autoComplete="name" value={form.name} onChange={onInput('name')} placeholder={t('contact.placeholders.name')} aria-invalid={Boolean(errors.name)} /></span>
                    </Field>
                    <Field label={`${t('contact.fields.email')} *`} error={errors.email} htmlFor={id('email')}>
                      <span data-field="email"><input id={id('email')} type="email" maxLength={254} autoComplete="email" dir="ltr" value={form.email} onChange={onInput('email')} placeholder={t('contact.placeholders.email')} aria-invalid={Boolean(errors.email)} /></span>
                    </Field>
                    <Field label={`${t('contact.fields.phone')} *`} error={errors.phone} htmlFor={id('phone')}>
                      <span data-field="phone"><input id={id('phone')} type="tel" maxLength={40} autoComplete="tel" dir="ltr" value={form.phone} onChange={onInput('phone')} placeholder={t('contact.placeholders.phone')} aria-invalid={Boolean(errors.phone)} /></span>
                    </Field>
                    <Field label={t('contact.fields.country')}>
                      <Dropdown
                        value={form.country}
                        onChange={chooseCountry}
                        options={countries.map((item) => ({ value: item.code, label: item.name }))}
                        placeholder={t('contact.placeholders.countrySelect')}
                        label={t('contact.fields.country')}
                        searchable
                        searchPlaceholder={t('contact.placeholders.countrySearch')}
                      />
                    </Field>
                    {form.country === 'TR' ? (
                      <Field label={t('contact.fields.deliveryCity')} optional>
                        <Dropdown
                          value={form.deliveryCity}
                          onChange={(value) => set('deliveryCity', value)}
                          options={TR_PROVINCES.map((city) => ({ value: city, label: city }))}
                          placeholder={t('contact.placeholders.provinceSelect')}
                          label={t('contact.fields.deliveryCity')}
                          searchable
                          searchPlaceholder={t('contact.placeholders.provinceSearch')}
                        />
                      </Field>
                    ) : (
                      <Field label={t('contact.fields.deliveryCity')} optional htmlFor={id('city')}>
                        <input id={id('city')} type="text" maxLength={200} autoComplete="address-level2" value={form.deliveryCity} onChange={onInput('deliveryCity')} placeholder={t('contact.placeholders.deliveryCity')} />
                      </Field>
                    )}
                  </div>

                  {/* Last look before sending */}
                  <div className="cpReview">
                    <h3><ClipboardCheck aria-hidden="true" />{p('summary.review')}</h3>
                    <dl>
                      {summary.filter((row) => row.value).map((row) => (
                        <div key={row.label}>
                          <dt>{row.label}</dt>
                          <dd dir={row.ltr ? 'ltr' : undefined}>{row.value}</dd>
                          <button type="button" onClick={() => goTo(row.step)} aria-label={`${p('summary.edit')}: ${row.label}`}>
                            <Pencil aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <ConsentBoxes form="quote" value={consents} onChange={setConsents} />
                </div>
              )}

              {feedback && <div className="cpFeedback" role="alert"><X aria-hidden="true" />{feedback}</div>}

              <footer className="cpNav">
                {step > 0 ? (
                  <button type="button" className="cpBack" onClick={() => goTo(step - 1)}>
                    <Arrow direction="left" />
                    <span>{p('nav.back')}</span>
                  </button>
                ) : <span />}

                <span className="cpSaved" aria-live="polite">{ready && (form.type || form.description) ? <><Check aria-hidden="true" />{p('nav.draftSaved')}</> : null}</span>

                {last ? (
                  <button type="submit" className="cpNext cpSubmit" disabled={status === 'loading'}>
                    {status === 'loading' ? <span className="cpSpinner" aria-hidden="true" /> : <Send aria-hidden="true" />}
                    <span>{status === 'loading' ? p('nav.sending') : p('nav.submit')}</span>
                  </button>
                ) : (
                  <button type="submit" className="cpNext">
                    <span>{p('nav.next')}</span>
                    <Arrow className="buttonArrow" />
                  </button>
                )}
              </footer>
            </form>
          </div>

          {/* Live summary */}
          <aside className="cpSummary" aria-label={p('summary.title')}>
            <div className="cpSummaryHead">
              <p className="eyebrow">{p('summary.eyebrow')}</p>
              <h2>{form.title.trim() || (form.type ? p(`types.${form.type}.title`) : p('summary.title'))}</h2>
              <div className="cpProgress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={p('summary.progressLabel')}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <small>{p('summary.progress', { value: progress })}</small>
            </div>

            <dl className="cpSummaryList">
              {summary.map((row) => (
                <div key={row.label} className={row.value ? 'filled' : ''}>
                  <dt>{row.label}</dt>
                  <dd dir={row.ltr && row.value ? 'ltr' : undefined}>{row.value || '—'}</dd>
                </div>
              ))}
            </dl>

            {form.nda && <p className="cpSummaryNda"><Lock aria-hidden="true" />{p('summary.nda')}</p>}

            <div className="cpSummaryContact">
              <span>{p('summary.questions')}</span>
              <a href={company.phone.href} dir="ltr"><Phone aria-hidden="true" />{company.phone.display}</a>
              <a href={`mailto:${company.email}`} dir="ltr"><Mail aria-hidden="true" />{company.email}</a>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
