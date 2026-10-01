import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Flag from './Flag';
import useLanguage from '../../hooks/useLanguage';
import {
  SUPPORTED_LANGUAGES,
  switchPathLanguage,
} from '../../i18n/languages';

/*
  Language dropdown with flags.
  Keyboard: Enter/Space/ArrowDown opens, arrows move, Home/End jump,
  Escape closes and returns focus to the trigger, Tab closes.
*/
export default function LanguageSwitcher({ className = '' }) {
  const { t } = useTranslation();
  const current = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const optionRefs = useRef([]);

  const menuId = useId();

  const currentIndex = SUPPORTED_LANGUAGES.findIndex(
    (language) => language.code === current.code
  );

  // Close on outside click
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  // Focus the active option when the menu opens
  useEffect(() => {
    if (open) {
      optionRefs.current[currentIndex]?.focus();
    }
  }, [open, currentIndex]);

  function focusOption(index) {
    const count = SUPPORTED_LANGUAGES.length;
    optionRefs.current[(index + count) % count]?.focus();
  }

  function selectLanguage(code) {
    setOpen(false);
    buttonRef.current?.focus();

    if (code === current.code) {
      return;
    }

    navigate(switchPathLanguage(location, code), {
      state: { preserveScroll: true },
    });
  }

  function handleButtonKeyDown(event) {
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
    }
  }

  function handleMenuKeyDown(event) {
    const index = optionRefs.current.indexOf(document.activeElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusOption(index + 1);
        break;

      case 'ArrowUp':
        event.preventDefault();
        focusOption(index - 1);
        break;

      case 'Home':
        event.preventDefault();
        focusOption(0);
        break;

      case 'End':
        event.preventDefault();
        focusOption(SUPPORTED_LANGUAGES.length - 1);
        break;

      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
        break;

      case 'Tab':
        setOpen(false);
        break;

      default:
        break;
    }
  }

  return (
    <div
      ref={rootRef}
      className={`languageSwitcher ${open ? 'open' : ''} ${className}`}
    >
      <button
        ref={buttonRef}
        type="button"
        className="languageSwitcherButton"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('language.change', { language: current.label })}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleButtonKeyDown}
      >
        <Flag code={current.flag} />

        <span className="languageSwitcherCode">
          {current.short}
        </span>

        <svg
          className="languageSwitcherChevron"
          viewBox="0 0 10 6"
          aria-hidden="true"
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      </button>

      <div
        id={menuId}
        className="languageSwitcherMenu"
        role="menu"
        aria-label={t('language.label')}
        hidden={!open}
        onKeyDown={handleMenuKeyDown}
      >
        <span className="languageSwitcherTitle">
          {t('language.label')}
        </span>

        {SUPPORTED_LANGUAGES.map((language, index) => {
          const active = language.code === current.code;

          return (
            <button
              key={language.code}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              lang={language.code}
              className={`languageSwitcherOption ${active ? 'active' : ''}`}
              tabIndex={-1}
              onClick={() => selectLanguage(language.code)}
            >
              <Flag code={language.flag} />

              <span className="languageSwitcherLabel">
                {language.label}
              </span>

              <span className="languageSwitcherShort">
                {language.short}
              </span>

              <svg
                className="languageSwitcherCheck"
                viewBox="0 0 12 10"
                aria-hidden="true"
              >
                <path
                  d="M1 5l3.5 3.5L11 1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
