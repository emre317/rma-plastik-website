import { useEffect, useState } from 'react';

import useAdminApi from '../../hooks/useAdminApi';
import usePageTitle from '../../hooks/usePageTitle';
import { getSettings, updateSettings } from '../../services/adminContentApi';

const GROUPS = [
  {
    title: 'İletişim',
    fields: [
      { key: 'phoneDisplay', label: 'Telefon (görünen)', placeholder: '+90 (324) 676 4500' },
      { key: 'phone', label: 'Telefon (arama için, boşluksuz)', placeholder: '+903246764500' },
      { key: 'whatsapp', label: 'WhatsApp numarası (ülke koduyla, yalnızca rakam)', placeholder: '905366700969', hint: 'Boş bırakılırsa WhatsApp balonu gizlenir.' },
      { key: 'email', label: 'E-posta', placeholder: 'info@rmaplastik.com', type: 'email' },
    ],
  },
  {
    title: 'Adres',
    fields: [
      { key: 'addressStreet', label: 'Sokak / OSB', placeholder: 'Mersin Tarsus OSB, Cumhuriyet Bulvarı No: 22' },
      { key: 'addressDistrict', label: 'İlçe, il', placeholder: 'Akdeniz, Mersin' },
      { key: 'addressCountry', label: 'Ülke', placeholder: 'Türkiye' },
    ],
  },
  {
    title: 'Sosyal medya',
    fields: [
      { key: 'linkedin', label: 'LinkedIn adresi', placeholder: 'https://www.linkedin.com/company/…', type: 'url' },
      { key: 'instagram', label: 'Instagram adresi', placeholder: 'https://www.instagram.com/…', type: 'url' },
      { key: 'instagramHandle', label: 'Instagram kullanıcı adı', placeholder: '@rmaplastik' },
      { key: 'youtube', label: 'YouTube adresi', placeholder: 'https://www.youtube.com/@…', type: 'url' },
      { key: 'youtubeHandle', label: 'YouTube kullanıcı adı', placeholder: '@rmaplastik5113' },
    ],
  },
];

const KEYS = GROUPS.flatMap((group) => group.fields.map((field) => field.key));

export default function AdminSettings() {
  usePageTitle('Site ayarları');

  const call = useAdminApi();

  const [form, setForm] = useState(Object.fromEntries(KEYS.map((key) => [key, ''])));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await call(getSettings);
        setForm(Object.fromEntries(KEYS.map((key) => [key, data?.[key] || ''])));
      } catch (err) {
        setMessage({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [call]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage(null);
      const { data } = await call(updateSettings, form);
      setForm(Object.fromEntries(KEYS.map((key) => [key, data?.[key] || ''])));
      setMessage({ type: 'success', text: 'Kaydedildi. Sitede görünmesi için “Yayınla”ya basın.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="adminContent">

      <div className="adminPageHeader">
        <div>
          <span className="adminLabel">İÇERİK YÖNETİMİ</span>
          <h1>Site ayarları</h1>
        </div>
      </div>

      <p className="cmsHint">Boş bırakılan alanlarda sitedeki mevcut bilgi kullanılır (gri yazı).</p>

      {loading ? (
        <div className="adminLoading">Yükleniyor…</div>
      ) : (
        <form className="cmsForm" onSubmit={handleSubmit}>

          {message && <div className={`cmsMessage ${message.type}`}>{message.text}</div>}

          <div className="cmsSettingsGrid">
            {GROUPS.map((group) => (
              <div key={group.title} className="cmsCard">
                <h2>{group.title}</h2>

                {group.fields.map((field) => (
                  <label key={field.key} className="cmsField">
                    <span>{field.label}</span>
                    <input
                      type={field.type || 'text'}
                      dir={['phone', 'phoneDisplay', 'whatsapp', 'email'].includes(field.key) ? 'ltr' : undefined}
                      value={form[field.key]}
                      placeholder={field.placeholder}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                    {field.hint && <small>{field.hint}</small>}
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="cmsSaveBar visible">
            <button type="submit" className="cmsButton cmsButtonPrimary" disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      )}

    </section>
  );
}
