import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { track } from './track';

function contactMethod(href) {
  if (href.startsWith('tel:')) return 'phone';
  if (href.startsWith('mailto:')) return 'email';
  if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href)) return 'whatsapp';
  return null;
}

/*
  - virtual_page_view on every route change (SPA navigation).
    Runs after the page's <Seo> effect, so document.title is already updated.
  - contact_click for every phone / email / WhatsApp link on the site.
*/
export default function AnalyticsTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      return;
    }

    track('virtual_page_view', {
      page_location: window.location.href,
      page_path: pathname + search,
      page_title: document.title,
      site_language: document.documentElement.lang,
    });
  }, [pathname, search]);

  useEffect(() => {
    function handleClick(event) {
      const link = event.target.closest?.('a[href]');

      if (!link) {
        return;
      }

      const href = link.getAttribute('href') || '';
      const method = contactMethod(href);

      if (!method) {
        return;
      }

      const area =
        link.closest('[data-track-area]')?.dataset.trackArea ||
        link.closest('section[id], footer, nav, header, [role="dialog"]')?.id ||
        link.closest('section, footer, nav, header, [role="dialog"]')?.tagName.toLowerCase() ||
        'page';

      track('contact_click', {
        contact_method: method,
        click_area: area,
        page_path: window.location.pathname,
      });
    }

    document.addEventListener('click', handleClick);

    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
