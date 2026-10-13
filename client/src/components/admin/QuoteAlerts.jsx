import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BellRing, X } from 'lucide-react';

import { getRecentQuotes } from '../../services/adminApi';
import { getAdminToken, notifyQuotesChanged } from '../../services/adminAuth';
import { useAdminSession } from './AdminSession';

/*
  New quote request alerts while the panel is open (sales and admin roles):
  the panel asks the server about once a minute; a new request shows a
  message in the corner, plays a short sound and, when the panel is in the
  background, a desktop notification. Settings are per browser (Hesabım).
*/

const POLL_MS = 60 * 1000;
const TOAST_MS = 25 * 1000;
const SETTINGS_KEY = 'rma_alert_settings';
const SEEN_KEY = 'rma_alerted_quotes';
export const ALERT_SETTINGS_EVENT = 'rma:alert-settings';
export const ALERT_TEST_EVENT = 'rma:alert-test';

const DEFAULTS = { sound: true, desktop: true };

export function getAlertSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function saveAlertSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private mode: the setting lasts for this page only
  }
  window.dispatchEvent(new Event(ALERT_SETTINGS_EVENT));
}

export const desktopSupported = () => typeof window !== 'undefined' && 'Notification' in window;

/* Several panel tabs: only the first one that sees a request plays the sound */
function claim(id) {
  try {
    const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
    if (seen.includes(id)) return false;
    localStorage.setItem(SEEN_KEY, JSON.stringify([id, ...seen].slice(0, 40)));
    return true;
  } catch {
    return true;
  }
}

/* A short two-note chime (no sound file to download) */
let audio = null;

function unlockAudio() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    audio = audio || new Context();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

export function playChime() {
  if (!audio) unlockAudio();
  if (!audio || audio.state !== 'running') return;

  const start = audio.currentTime + 0.02;
  [[880, 0], [1318.5, 0.16]].forEach(([frequency, offset]) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.18, start + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.5);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + 0.55);
  });
}

const describe = (quote) => [quote.product, quote.country].filter(Boolean).join(' · ');

export default function QuoteAlerts() {
  const navigate = useNavigate();
  const { can } = useAdminSession();
  const sales = can('sales');

  const [toasts, setToasts] = useState([]);
  const since = useRef(null);
  const settings = useRef(getAlertSettings());

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast._id !== id)), []);

  const show = useCallback((quotes, { test = false } = {}) => {
    setToasts((list) => [...quotes.map((quote) => ({ ...quote, test })), ...list.filter((toast) => !quotes.some((quote) => quote._id === toast._id))].slice(0, 4));
    quotes.forEach((quote) => setTimeout(() => dismiss(quote._id), TOAST_MS));
  }, [dismiss]);

  const alert = useCallback((quotes) => {
    const fresh = quotes.filter((quote) => claim(String(quote._id)));
    show(quotes);
    notifyQuotesChanged();
    if (!fresh.length) return;

    if (settings.current.sound) playChime();

    if (settings.current.desktop && desktopSupported() && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      fresh.slice(0, 3).forEach((quote) => {
        try {
          const notification = new Notification(`Yeni teklif talebi: ${quote.company}`, {
            body: describe(quote) || quote.name,
            tag: `quote-${quote._id}`,
            icon: '/favicon-32.png',
          });
          notification.onclick = () => {
            window.focus();
            navigate(`/admin/quotes/${quote._id}`);
            notification.close();
          };
        } catch {
          // Some browsers (Android) only allow notifications from a service worker
        }
      });
    }
  }, [navigate, show]);

  // Sound needs one click on the page first (browser autoplay rules)
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      settings.current = getAlertSettings();
    };
    const test = () => {
      show([{ _id: `test-${Date.now()}`, company: 'Örnek Firma', name: 'Deneme', product: 'RD 1000', country: 'Türkiye' }], { test: true });
      if (settings.current.sound) playChime();
    };
    window.addEventListener(ALERT_SETTINGS_EVENT, update);
    window.addEventListener(ALERT_TEST_EVENT, test);
    return () => {
      window.removeEventListener(ALERT_SETTINGS_EVENT, update);
      window.removeEventListener(ALERT_TEST_EVENT, test);
    };
  }, [show]);

  useEffect(() => {
    if (!sales) return undefined;

    let cancelled = false;
    let timer = null;

    async function poll() {
      const token = getAdminToken();
      if (!token) return;

      try {
        const response = await getRecentQuotes(since.current, token);
        if (cancelled) return;
        const fresh = Array.isArray(response.data) ? response.data : [];
        // The newest request seen becomes the next starting point
        since.current = fresh[0]?.createdAt || response.now || since.current;
        if (fresh.length) alert(fresh);
      } catch {
        // Offline or signed out: try again at the next round (the sidebar handles sign-out)
      }
    }

    poll();
    timer = setInterval(poll, POLL_MS);

    // Back to the tab after a while: ask at once
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sales, alert]);

  if (!toasts.length) return null;

  return (
    <div className="adToasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast._id} className="adToast">
          <span className="adToastIcon" aria-hidden="true"><BellRing /></span>
          <span className="adToastText">
            <small>{toast.test ? 'Deneme bildirimi' : 'Yeni teklif talebi'}</small>
            <strong>{toast.company}</strong>
            {describe(toast) && <span>{describe(toast)}</span>}
          </span>
          {!toast.test && (
            <Link to={`/admin/quotes/${toast._id}`} className="adToastOpen" onClick={() => dismiss(toast._id)}>Aç</Link>
          )}
          <button type="button" className="adIconButton" onClick={() => dismiss(toast._id)} aria-label="Bildirimi kapat">
            <X aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
