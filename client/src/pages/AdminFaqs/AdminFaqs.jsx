import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { FAQ_TOPICS } from '../../data/faq';
import tr from '../../i18n/locales/tr';
import { createFaq, deleteFaq, listFaqs, updateFaq } from '../../services/adminContentApi';
import Dropdown from '../../components/ui/Dropdown';

const LANGS = [
  { code: 'tr', label: 'Türkçe', short: 'TR' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ar', label: 'العربية', short: 'AR', dir: 'rtl' },
];

const topicLabel = (id) => tr.faq.topics[id] || id;

/*
  Draft questions only (no answers): the company writes the answers.
  They are added hidden ("Taslak") until an answer is written.
*/
const TEMPLATES = [
  {
    topic: 'delivery',
    tr: 'Siparişler ne kadar sürede teslim edilir?',
    en: 'How long does delivery take?',
    ar: 'كم تستغرق مدة التسليم؟',
  },
  {
    topic: 'delivery',
    tr: 'Yurt dışına gönderim yapıyor musunuz?',
    en: 'Do you ship abroad?',
    ar: 'هل تقومون بالشحن إلى الخارج؟',
  },
  {
    topic: 'installation',
    tr: 'Depolar nasıl kurulur? Montaj desteği veriyor musunuz?',
    en: 'How are the tanks installed? Do you offer installation support?',
    ar: 'كيف يتم تركيب الخزانات؟ هل تقدمون دعماً للتركيب؟',
  },
  {
    topic: 'colours',
    tr: 'Hangi renk seçenekleri var?',
    en: 'Which colours are available?',
    ar: 'ما هي خيارات الألوان المتاحة؟',
  },
  {
    topic: 'uv',
    tr: 'Depolar güneş ışığına (UV) ve dış ortama dayanıklı mı?',
    en: 'Are the tanks resistant to sunlight (UV) and outdoor conditions?',
    ar: 'هل الخزانات مقاومة لأشعة الشمس (UV) والظروف الخارجية؟',
  },
  {
    topic: 'warranty',
    tr: 'Ürünlerin garantisi var mı?',
    en: 'Do the products come with a warranty?',
    ar: 'هل تأتي المنتجات مع ضمان؟',
  },
  {
    topic: 'products',
    tr: 'Depolar içme suyu ve gıda için uygun mu?',
    en: 'Are the tanks suitable for drinking water and food?',
    ar: 'هل الخزانات مناسبة لمياه الشرب والأغذية؟',
  },
  {
    topic: 'products',
    tr: 'Katalogda olmayan bir ölçü veya ürün üretebilir misiniz?',
    en: 'Can you produce a size or product that is not in the catalogue?',
    ar: 'هل يمكنكم تصنيع مقاس أو منتج غير موجود في الكتالوج؟',
  },
  {
    topic: 'order',
    tr: 'Minimum sipariş miktarı var mı?',
    en: 'Is there a minimum order quantity?',
    ar: 'هل هناك حد أدنى لكمية الطلب؟',
  },
  {
    topic: 'order',
    tr: 'Teklif almak için hangi bilgileri paylaşmalıyım?',
    en: 'What information should I share to get a quote?',
    ar: 'ما المعلومات التي يجب مشاركتها للحصول على عرض سعر؟',
  },
];

const emptyTexts = () => Object.fromEntries(LANGS.map(({ code }) => [code, { question: '', answer: '' }]));

const empty = (order) => ({ _id: null, topic: 'general', published: true, order, i18n: emptyTexts() });

const answered = (faq, lang) => Boolean(faq.i18n?.[lang]?.question && faq.i18n?.[lang]?.answer);

/* FAQ page and the questions on the contact page (Sık sorulan sorular) */
export default function AdminFaqs() {
  usePageTitle('Sık sorulan sorular');

  const call = useAdminApi();

  const [faqs, setFaqs] = useState([]);
  const [form, setForm] = useState(null);
  const [lang, setLang] = useState('tr');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const { data } = await call(listFaqs);
      setFaqs(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function edit(faq) {
    setMessage(null);
    setLang('tr');
    setForm(
      faq
        ? {
            _id: faq._id,
            topic: faq.topic || 'general',
            // A draft being answered goes live on save unless unticked
            published: faq.published || !answered(faq, 'tr'),
            order: faq.order,
            i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { question: '', answer: '', ...faq.i18n?.[code] }])),
          }
        : empty(((faqs[faqs.length - 1]?.order) || 0) + 10)
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const setText = (field, value) =>
    setForm((current) => ({ ...current, i18n: { ...current.i18n, [lang]: { ...current.i18n[lang], [field]: value } } }));

  async function save(event) {
    event.preventDefault();

    try {
      setSaving(true);
      if (form._id) await call(updateFaq, form._id, form);
      else await call(createFaq, form);
      setForm(null);
      setMessage({ type: 'success', text: 'Soru kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove(faq) {
    if (!window.confirm(`"${faq.i18n?.tr?.question || 'Soru'}" silinsin mi?`)) return;

    try {
      await call(deleteFaq, faq._id);
      setFaqs((list) => list.filter((item) => item._id !== faq._id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  // Up/down; orders are renumbered 10, 20, 30…
  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= faqs.length) return;

    const next = [...faqs];
    [next[index], next[target]] = [next[target], next[index]];
    const changed = next
      .map((faq, position) => ({ ...faq, order: (position + 1) * 10 }))
      .filter((faq) => faq.order !== faqs.find((item) => item._id === faq._id).order);

    try {
      setSaving(true);
      await Promise.all(changed.map((faq) => call(updateFaq, faq._id, faq)));
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function addTemplates() {
    try {
      setSaving(true);
      for (const [index, item] of TEMPLATES.entries()) {
        // Sequential so the order stays as listed
        await call(createFaq, {
          topic: item.topic,
          published: false,
          order: (index + 1) * 10,
          i18n: Object.fromEntries(LANGS.map(({ code }) => [code, { question: item[code], answer: '' }])),
        });
      }
      setMessage({ type: 'success', text: `${TEMPLATES.length} taslak soru eklendi. “Cevap yaz” ile cevabı yazıp kaydedin; soru sitede gösterilir.` });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const activeLanguage = LANGS.find((item) => item.code === lang);
  const live = faqs.filter((faq) => faq.published && answered(faq, 'tr')).length;

  return (
    <section className="adminContent">
      <header className="adPageHead">
        <div>
          <span className="adEyebrow">İçerik</span>
          <h1>Sık sorulan sorular</h1>
          <p>
            Sitedeki “Sık sorulan sorular” sayfası ve İletişim sayfasındaki ilk beş soru. Her dilde yalnızca o dilde cevabı yazılmış sorular
            gösterilir; Google’da soru-cevap olarak da görünebilir. Sayfa ve bağlantısı ilk soru yayınlanınca açılır.
          </p>
        </div>
        {!form && (
          <button type="button" className="cmsButton cmsButtonPrimary" onClick={() => edit(null)}>+ Yeni soru</button>
        )}
      </header>

      {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

      {form && (
        <form className="cmsCard cmsVideoForm" onSubmit={save}>
          <div className="cmsInline cmsInlineEven">
            <div className="cmsField">
              <span>Konu</span>
              <Dropdown
                value={form.topic}
                onChange={(topic) => setForm({ ...form, topic })}
                label="Konu"
                options={FAQ_TOPICS.map((id) => ({ value: id, label: topicLabel(id) }))}
              />
            </div>

            <label className="cmsField">
              <span>Sıra</span>
              <input type="number" value={form.order} onChange={(event) => setForm({ ...form, order: event.target.value })} />
              <small>Küçük sayı önce gösterilir.</small>
            </label>
          </div>

          <div className="cmsTabs" role="tablist">
            {LANGS.map((item) => (
              <button key={item.code} type="button" role="tab" aria-selected={lang === item.code} className={lang === item.code ? 'active' : ''} onClick={() => setLang(item.code)}>
                {item.label}
                {answered(form, item.code) && ' ✓'}
              </button>
            ))}
          </div>

          <label className="cmsField">
            <span>Soru{lang === 'tr' ? ' *' : ''}</span>
            <input dir={activeLanguage.dir} value={form.i18n[lang].question} maxLength={300} onChange={(event) => setText('question', event.target.value)} required={lang === 'tr'} />
          </label>

          <label className="cmsField">
            <span>Cevap{lang === 'tr' && form.published ? ' *' : ''}</span>
            <textarea dir={activeLanguage.dir} rows={6} value={form.i18n[lang].answer} maxLength={3000} onChange={(event) => setText('answer', event.target.value)} />
            <small>
              {lang === 'tr'
                ? 'Kısa ve net yazın. Paragraf için bir satır boş bırakın. Teslim süresi, garanti gibi bilgileri yalnızca güncel ve doğruysa yazın.'
                : 'Bu dilde soru veya cevap boşsa soru bu dildeki sitede gösterilmez.'}
            </small>
          </label>

          <label className="cmsCheck">
            <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
            <span>Sitede göster (Türkçe cevap gerekir)</span>
          </label>

          <div className="cmsRowActions">
            <button type="button" className="cmsButton" onClick={() => setForm(null)}>Vazgeç</button>
            <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="adSkeletonList" aria-label="Yükleniyor">{[0, 1, 2].map((i) => <span key={i} />)}</div>
      ) : faqs.length === 0 ? (
        !form && (
          <div className="cmsEmpty">
            <p>
              Henüz soru yok; sitede SSS sayfası gösterilmiyor. İsterseniz sık sorulan {TEMPLATES.length} soruyu (teslimat, montaj, renk, UV, garanti,
              sipariş…) üç dilde taslak olarak ekleyin; cevaplarını siz yazarsınız.
            </p>
            <button type="button" className="cmsButton cmsButtonPrimary" onClick={addTemplates} disabled={saving}>
              {saving ? 'Ekleniyor…' : 'Taslak soruları ekle'}
            </button>
          </div>
        )
      ) : (
        <>
          <p className="adFaqSummary">{faqs.length} soru · sitede {live}</p>
          <ol className="adFaqList">
            {faqs.map((faq, index) => {
              const ready = answered(faq, 'tr');
              const state = faq.published && ready ? 'live' : ready ? 'hidden' : 'draft';

              return (
                <li key={faq._id} className={state}>
                  <span className="adFaqText">
                    <small>{topicLabel(faq.topic)}</small>
                    <strong>{faq.i18n?.tr?.question}</strong>
                    <span className="adFaqMeta">
                      <em className={`adFaqState ${state}`}>{state === 'live' ? 'Sitede' : state === 'hidden' ? 'Gizli' : 'Cevap Bekliyor'}</em>
                      {LANGS.map((item) => (
                        <span key={item.code} className={`adLangBadge ${answered(faq, item.code) ? 'ok' : ''}`} title={answered(faq, item.code) ? `${item.label}: hazır` : `${item.label}: eksik`}>
                          {item.short}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="adMarketMove">
                    <button type="button" className="adIconButton" onClick={() => move(index, -1)} disabled={saving || index === 0} aria-label="Yukarı taşı"><ArrowUp aria-hidden="true" /></button>
                    <button type="button" className="adIconButton" onClick={() => move(index, 1)} disabled={saving || index === faqs.length - 1} aria-label="Aşağı taşı"><ArrowDown aria-hidden="true" /></button>
                  </span>
                  <span className="cmsRowActions">
                    <button type="button" className="cmsButton" onClick={() => edit(faq)}>{ready ? 'Düzenle' : 'Cevap Yaz'}</button>
                    <button type="button" className="cmsButton cmsButtonDanger" onClick={() => remove(faq)}>Sil</button>
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
