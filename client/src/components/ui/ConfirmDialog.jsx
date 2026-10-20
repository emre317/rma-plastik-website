import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';

/*
  One confirmation dialog for the whole project, instead of the browser's
  window.confirm:

    const confirm = useConfirm();
    if (!(await confirm({ title, message, confirmLabel, tone: 'danger' }))) return;

  tone: 'danger' (deleting, red), 'warning' (amber) or 'default'.
  Escape / the backdrop / Vazgeç answer false; focus stays inside the dialog
  and goes back to the button that opened it.
*/

const ConfirmContext = createContext(null);

const ICONS = { danger: Trash2, warning: AlertTriangle, default: HelpCircle };

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);
  const opener = useRef(null);

  const confirm = useCallback((options = {}) => {
    // A second request while one is open answers the first with "no"
    resolver.current?.(false);
    opener.current = typeof document !== 'undefined' ? document.activeElement : null;

    return new Promise((resolve) => {
      resolver.current = resolve;
      setRequest({
        tone: 'default',
        confirmLabel: 'Onayla',
        cancelLabel: 'Vazgeç',
        ...options,
      });
    });
  }, []);

  const close = useCallback((answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setRequest(null);
    // Back to where the user was
    const target = opener.current;
    opener.current = null;
    if (target && typeof target.focus === 'function' && target.isConnected) {
      requestAnimationFrame(() => target.focus());
    }
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmDialog request={request} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);

  // Outside the provider (should not happen): fall back to the browser dialog
  return confirm || ((options = {}) => Promise.resolve(window.confirm([options.title, options.message].filter(Boolean).join('\n\n'))));
}

function ConfirmDialog({ request, onClose }) {
  const id = useId();
  const panel = useRef(null);
  const cancelButton = useRef(null);
  const confirmButton = useRef(null);
  const tone = ICONS[request.tone] ? request.tone : 'default';
  const Icon = ICONS[tone];

  useEffect(() => {
    // Dangerous actions start on "Vazgeç", others on the confirm button
    (tone === 'danger' ? cancelButton : confirmButton).current?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose(false);
        return;
      }

      // Keep Tab inside the dialog
      if (event.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll('button:not([disabled])')];
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, tone]);

  const details = Array.isArray(request.details) ? request.details.filter(Boolean) : [];

  return createPortal(
    <div className="confirmLayer" onMouseDown={(event) => event.target === event.currentTarget && onClose(false)}>
      <div
        ref={panel}
        className={`confirmPanel tone-${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={request.message || details.length ? `${id}-text` : undefined}
      >
        <span className="confirmIcon" aria-hidden="true"><Icon /></span>

        <div className="confirmBody">
          <h2 id={`${id}-title`}>{request.title || 'Emin misiniz?'}</h2>
          {(request.message || details.length > 0) && (
            <div id={`${id}-text`} className="confirmText">
              {request.message && <p>{request.message}</p>}
              {details.length > 0 && (
                <ul>
                  {details.map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="confirmActions">
          <button ref={cancelButton} type="button" className="confirmCancel" onClick={() => onClose(false)}>
            {request.cancelLabel}
          </button>
          <button ref={confirmButton} type="button" className="confirmOk" onClick={() => onClose(true)}>
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
