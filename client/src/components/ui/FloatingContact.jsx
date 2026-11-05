import { useTranslation } from 'react-i18next';
import { CalendarDays, Mail, Phone } from 'lucide-react';

import { WhatsappIcon } from '../icons/SocialIcons';
import { useMeeting } from '../meeting/MeetingContext';
import company from '../../data/company';

/*
  Floating quick-contact bubbles (meeting request, WhatsApp, call, email)
  fixed to the side of the screen: solid, high-contrast bubbles (brand red,
  WhatsApp green, phone blue, e-mail black) with a white ring; a tooltip
  slides out on hover. The meeting bubble opens the meeting request dialog.
*/
export default function FloatingContact() {
  const { t } = useTranslation();
  const { openMeeting } = useMeeting();

  const items = [
    {
      key: 'meeting',
      label: t('floatingContact.meeting'),
      icon: CalendarDays,
      color: 'var(--rma-red)',
      onClick: () => openMeeting(),
    },
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
      color: 'var(--rma-blue)',
    },
    {
      key: 'email',
      href: `mailto:${company.email}`,
      label: t('floatingContact.email'),
      icon: Mail,
      color: 'var(--ink-900)',
    },
  ].filter(Boolean);

  return (
    <nav className="floatingContact" data-track-area="floating_bubbles" aria-label={t('floatingContact.label')}>
      <ul>
        {items.map((item, index) => {
          const inner = (
            <>
              <span className="floatingContactFill" aria-hidden="true" />
              <item.icon className="floatingContactIcon" aria-hidden="true" />
            </>
          );

          return (
            <li
              key={item.key}
              className={`floatingContactItem floatingContact-${item.key}`}
              style={{ '--bubble-color': item.color, '--bubble-delay': `${index * 90}ms` }}
            >
              {item.onClick ? (
                <button type="button" onClick={item.onClick} aria-label={item.label} aria-haspopup="dialog">
                  {inner}
                </button>
              ) : (
                <a
                  href={item.href}
                  aria-label={item.label}
                  {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {inner}
                </a>
              )}

              <span className="floatingContactTooltip" aria-hidden="true">
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
