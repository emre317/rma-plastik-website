import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import products from '../../data/products';
import { submitQuote } from '../../services/api';
import { ArrowDown, Mail, MapPin, Navigation } from 'lucide-react';

import Arrow from '../../components/i18n/Arrow';
import {
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from '../../components/icons/SocialIcons';
import company from '../../data/company';
import useProducts from '../../hooks/useProducts';
import usePageTitle from '../../hooks/usePageTitle';

const initialForm = {
  company: '',
  name: '',
  email: '',
  phone: '',
  country: '',
  product: '',
  capacity: '',
  quantity: '',
  application: '',
  message: '',
};

function getInitialForm(productSlug) {
  const product = products.find(
    (item) => item.slug === productSlug
  );

  return {
    ...initialForm,
    product: product ? product.quoteName : '',
  };
}

function errorMessageKey(error) {
  if (error?.status === 0) {
    return 'contact.errors.network';
  }

  if (error?.status === 429) {
    return 'contact.errors.rateLimited';
  }

  if (error?.status === 400) {
    return 'contact.errors.validation';
  }

  return 'contact.errors.generic';
}

export default function Contact() {
  const { t, i18n } = useTranslation();
  const localizedProducts = useProducts();

  usePageTitle(t('meta.titles.contact'));

  const [searchParams] = useSearchParams();

  const [form, setForm] = useState(() =>
    getInitialForm(searchParams.get('product'))
  );
  const [status, setStatus] = useState('idle');
  const [feedbackKey, setFeedbackKey] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setStatus('loading');
    setFeedbackKey('');

    try {
      await submitQuote({
        ...form,
        language: i18n.resolvedLanguage,
      });

      setStatus('success');
      setFeedbackKey('contact.success');
      setForm(initialForm);
    } catch (error) {
      setStatus('error');
      setFeedbackKey(errorMessageKey(error));
    }
  }

  const meta = t('contact.meta', { returnObjects: true });

  const channels = [
    {
      key: 'email',
      href: `mailto:${company.email}`,
      icon: Mail,
      label: t('contact.locations.email'),
      value: company.email,
      ltr: true,
    },
    {
      key: 'linkedin',
      href: company.social.linkedin,
      icon: LinkedinIcon,
      label: t('contact.locations.linkedin'),
      value: t('contact.locations.linkedinValue'),
      external: true,
    },
    {
      key: 'instagram',
      href: company.social.instagram,
      icon: InstagramIcon,
      label: t('contact.locations.instagram'),
      value: company.handles.instagram,
      external: true,
      ltr: true,
    },
    {
      key: 'youtube',
      href: company.social.youtube,
      icon: YoutubeIcon,
      label: t('contact.locations.youtube'),
      value: company.handles.youtube,
      external: true,
      ltr: true,
    },
  ];

  const fieldLabel = (name, required = false) =>
    `${t(`contact.fields.${name}`)}${required ? ' *' : ''}`;

  return (
    <main className="contactPage">

      <section className="internalHero contactPageHero">
        <div className="container">

          <div className="internalHeroMeta">
            <span>{meta[0]}</span>
            <span>{meta[1]}</span>
          </div>

          <div className="internalHeroGrid">

            <p className="eyebrow">
              {t('contact.eyebrow')}
            </p>

            <h1>
              {t('contact.title')}
              <span>{t('contact.titleAccent')}</span>
            </h1>

          </div>

          <div className="internalHeroBottom">

            <p>
              {t('contact.text')}
            </p>

            <span>
              {t('contact.tag')}
            </span>

          </div>

        </div>
      </section>


      <section className="contactLocations dark">
        <div className="container">

          <div className="contactLocationsHeader">

            <div>
              <span className="sectionIndex light">
                {t('contact.locations.index')}
              </span>

              <p className="eyebrow">
                {t('contact.locations.eyebrow')}
              </p>
            </div>

            <div>
              <h2>
                {t('contact.locations.title')}
                <span>{t('contact.locations.titleAccent')}</span>
              </h2>

              <p>
                {t('contact.locations.text')}
              </p>
            </div>

          </div>

          <div className="contactLocationsGrid">

            <div className="contactMap">
              <iframe
                title={t('contact.locations.mapTitle')}
                src={company.maps.embed(i18n.resolvedLanguage)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div className="contactLocationsSide">

              <div className="contactAddressCard">
                <span className="contactChannelsLabel">
                  <MapPin aria-hidden="true" />
                  {t('contact.locations.addressLabel')}
                </span>

                <address>
                  <strong>{company.name}</strong>
                  <span>{company.address.street}</span>
                  <span>{company.address.district}</span>
                  <span>{company.address.country}</span>
                </address>

                <div className="contactAddressActions">
                  <a
                    href={company.maps.directions}
                    target="_blank"
                    rel="noreferrer"
                    className="contactChannel contactChannelPrimary"
                  >
                    <Navigation aria-hidden="true" />
                    <span>
                      <strong>{t('contact.locations.directions')}</strong>
                    </span>
                  </a>

                  <a
                    href={company.maps.open}
                    target="_blank"
                    rel="noreferrer"
                    className="contactTextLink"
                  >
                    {t('contact.locations.openMap')}
                    <Arrow />
                  </a>
                </div>
              </div>

              <div className="contactChannels">

                <span className="contactChannelsLabel">
                  {t('contact.locations.channels')}
                </span>

                {channels.map((channel) => (
                  <a
                    key={channel.key}
                    href={channel.href}
                    className="contactChannel"
                    {...(channel.external
                      ? { target: '_blank', rel: 'noreferrer' }
                      : {})}
                  >
                    <channel.icon aria-hidden="true" />
                    <span>
                      <small>{channel.label}</small>
                      <strong dir={channel.ltr ? 'ltr' : undefined}>
                        {channel.value}
                      </strong>
                    </span>
                    {channel.external && <Arrow />}
                  </a>
                ))}

                <a href="#quote-form" className="contactChannel contactChannelOutline">
                  <ArrowDown aria-hidden="true" />
                  <span>
                    <small>{t('contact.locations.form')}</small>
                    <strong>{t('contact.locations.formValue')}</strong>
                  </span>
                </a>

              </div>

            </div>

          </div>

        </div>
      </section>


      <section className="quoteSection" id="quote-form">

        <div className="container">

          <div className="quoteHeader">

            <div>
              <span className="sectionIndex">
                {t('contact.formIndex')}
              </span>

              <p className="eyebrow">
                {t('contact.formEyebrow')}
              </p>
            </div>

            <div>
              <h2>
                {t('contact.formTitle')}
                <span>{t('contact.formTitleAccent')}</span>
              </h2>

              <p>
                {t('contact.formText')}
              </p>
            </div>

          </div>


          <div className="quoteLayout">

            <aside className="quoteSidebar">

              <span className="quoteSidebarLabel">
                {t('contact.sidebarLabel')}
              </span>

              <h3>
                {t('contact.sidebarTitle')}
              </h3>

              <p>
                {t('contact.sidebarText')}
              </p>

              <div className="quoteSidebarDetails">

                <div>
                  <span>{t('contact.sidebarAddress')}</span>
                  <strong>
                    {company.address.street}
                    <br />
                    {company.address.district}, {company.address.country}
                  </strong>
                </div>

                <div>
                  <span>{t('contact.sidebarEmail')}</span>
                  <strong>
                    <a href={`mailto:${company.email}`} dir="ltr">
                      {company.email}
                    </a>
                  </strong>
                </div>

              </div>

            </aside>


            <form
              className="quoteForm"
              onSubmit={handleSubmit}
            >

              <div className="formGrid">

                <label className="formField">
                  <span>
                    {fieldLabel('company', true)}
                  </span>

                  <input
                    type="text"
                    name="company"
                    maxLength={150}
                    value={form.company}
                    onChange={handleChange}
                    required
                    placeholder={t('contact.placeholders.company')}
                  />
                </label>


                <label className="formField">
                  <span>
                    {fieldLabel('name', true)}
                  </span>

                  <input
                    type="text"
                    name="name"
                    maxLength={120}
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder={t('contact.placeholders.name')}
                  />
                </label>


                <label className="formField">
                  <span>
                    {fieldLabel('email', true)}
                  </span>

                  <input
                    type="email"
                    name="email"
                    dir="ltr"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder={t('contact.placeholders.email')}
                  />
                </label>


                <label className="formField">
                  <span>
                    {fieldLabel('phone')}
                  </span>

                  <input
                    type="tel"
                    name="phone"
                    dir="ltr"
                    maxLength={40}
                    value={form.phone}
                    onChange={handleChange}
                    placeholder={t('contact.placeholders.phone')}
                  />
                </label>


                <label className="formField">
                  <span>
                    {fieldLabel('country')}
                  </span>

                  <input
                    type="text"
                    name="country"
                    maxLength={80}
                    value={form.country}
                    onChange={handleChange}
                    placeholder={t('contact.placeholders.country')}
                  />
                </label>


                <label className="formField">
                  <span>
                    {fieldLabel('product')}
                  </span>

                  <select
                    name="product"
                    value={form.product}
                    onChange={handleChange}
                  >
                    <option value="">
                      {t('contact.placeholders.product')}
                    </option>

                    {localizedProducts.map((product) => (
                      <option
                        key={product.slug}
                        value={product.quoteName}
                      >
                        {product.name}
                      </option>
                    ))}

                    <option value="Custom Requirement">
                      {t('contact.customRequirement')}
                    </option>
                  </select>
                </label>


                <label className="formField">
                  <span>
                    {fieldLabel('capacity')}
                  </span>

                  <input
                    type="text"
                    name="capacity"
                    maxLength={80}
                    value={form.capacity}
                    onChange={handleChange}
                    placeholder={t('contact.placeholders.capacity')}
                  />
                </label>


                <label className="formField">
                  <span>
                    {fieldLabel('quantity')}
                  </span>

                  <input
                    type="number"
                    min="1"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder={t('contact.placeholders.quantity')}
                  />
                </label>


                <label className="formField formFieldFull">
                  <span>
                    {fieldLabel('application')}
                  </span>

                  <input
                    type="text"
                    name="application"
                    maxLength={200}
                    value={form.application}
                    onChange={handleChange}
                    placeholder={t('contact.placeholders.application')}
                  />
                </label>


                <label className="formField formFieldFull">
                  <span>
                    {fieldLabel('message', true)}
                  </span>

                  <textarea
                    name="message"
                    maxLength={5000}
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows="7"
                    placeholder={t('contact.placeholders.message')}
                  />
                </label>

              </div>


              <div className="quoteFormBottom">

                <p>
                  {t('contact.consent')}
                </p>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="quoteSubmit"
                >
                  <span>
                    {status === 'loading'
                      ? t('contact.sending')
                      : t('contact.submit')}
                  </span>

                  <Arrow />
                </button>

              </div>


              {feedbackKey && (
                <div
                  className={`quoteFeedback ${status}`}
                  role={status === 'error' ? 'alert' : 'status'}
                >
                  {t(feedbackKey)}
                </div>
              )}

            </form>

          </div>

        </div>

      </section>

    </main>
  );
}