import { useTranslation } from 'react-i18next';
import { Mail, Phone } from 'lucide-react';

import { WhatsappIcon } from '../icons/SocialIcons';
import company from '../../data/company';

/*
  Floating quick-contact bubbles (WhatsApp, call, email) fixed to the side
  of the screen. Adapted from the "social-media" tooltip block: on hover the
  brand colour fills the bubble from the bottom and a tooltip slides out.
*/
export default function FloatingContact() {
  const { t } = useTranslation();

  const items = [
    company.whatsapp && {
      key: 'whatsapp',
      href: `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(t('floatingContact.whatsappMessage'))}`,
      label: t('floatingContact.whatsapp'),
      icon: WhatsappIcon,
      color: '#25d366',
      external: true,
    },
    {
      key: 'phone',
      href: company.phone.href,
      label: t('floatingContact.phone'),
      icon: Phone,
      color: 'var(--accent)',
    },
    {
      key: 'email',
      href: `mailto:${company.email}`,
      label: t('floatingContact.email'),
      icon: Mail,
      color: 'var(--dark)',
    },
  ].filter(Boolean);

  return (
    <nav className="floatingContact" data-track-area="floating_bubbles" aria-label={t('floatingContact.label')}>
      <ul>
        {items.map((item, index) => (
          <li
            key={item.key}
            className={`floatingContactItem floatingContact-${item.key}`}
            style={{ '--bubble-color': item.color, '--bubble-delay': `${index * 90}ms` }}
          >
            <a
              href={item.href}
              aria-label={item.label}
              {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <span className="floatingContactFill" aria-hidden="true" />
              <item.icon className="floatingContactIcon" aria-hidden="true" />
            </a>

            <span className="floatingContactTooltip" aria-hidden="true">
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
