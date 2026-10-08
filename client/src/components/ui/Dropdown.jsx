import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

/*
  Rounded dropdown used instead of the browser's square <select> on the site.
    <Dropdown value={sort} onChange={setSort} options={[{ value, label }]} label="Sırala" />
  - Keyboard: ↑ ↓ Home End move, Enter / Space choose, Esc closes, typing jumps
    to the first matching option (or filters, with `searchable`).
  - Screen readers: button + listbox, the active option is announced.
  - `name` adds a hidden input so the value is also part of a <form>.
*/
const fold = (text) => String(text || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = '',
  label,
  name,
  searchable = false,
  searchPlaceholder = '',
  className = '',
  icon: Icon,
  align = 'start',
}) {
  const id = useId();
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const typed = useRef({ text: '', time: 0 });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [upward, setUpward] = useState(false);

  const selected = options.find((option) => String(option.value) === String(value));

  const shown = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const needle = fold(query.trim());
    return options.filter((option) => fold(option.label).includes(needle));
  }, [options, query, searchable]);

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // On open: start at the chosen option, open upwards when there is no room below
  useEffect(() => {
    if (!open) return;
    const index = shown.findIndex((option) => String(option.value) === String(value));
    setActive(index >= 0 ? index : 0);
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setUpward(window.innerHeight - rect.bottom < 280 && rect.top > window.innerHeight - rect.bottom);
    if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the active option in view
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function choose(option) {
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery('');
    rootRef.current?.querySelector('.ddTrigger')?.focus();
  }

  function onKeyDown(event) {
    const last = shown.length - 1;

    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      rootRef.current?.querySelector('.ddTrigger')?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(last, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(last);
    } else if (event.key === 'Enter' || (event.key === ' ' && !searchable)) {
      event.preventDefault();
      choose(shown[active]);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (!searchable && event.key.length === 1) {
      // Type-ahead: jump to the first option starting with the typed letters
      const now = Date.now();
      typed.current = { text: (now - typed.current.time < 700 ? typed.current.text : '') + event.key, time: now };
      const index = shown.findIndex((option) => fold(option.label).startsWith(fold(typed.current.text)));
      if (index >= 0) setActive(index);
    }
  }

  return (
    <div ref={rootRef} className={`dd ${open ? 'open' : ''} ${upward ? 'up' : ''} ${className}`} onKeyDown={onKeyDown}>
      {name && <input type="hidden" name={name} value={value ?? ''} />}

      <button
        type="button"
        className="ddTrigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={label ? `${label}: ${selected?.label || placeholder}` : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {Icon && <Icon className="ddIcon" aria-hidden="true" />}
        <span className={`ddValue ${selected ? '' : 'placeholder'}`}>{selected?.label || placeholder}</span>
        <ChevronDown className="ddChevron" aria-hidden="true" />
      </button>

      {open && (
        <div className={`ddPanel ${align === 'end' ? 'end' : ''}`}>
          {searchable && (
            <label className="ddSearch">
              <Search aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder || label}
                aria-controls={`${id}-list`}
                aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
              />
            </label>
          )}

          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            className="ddList"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={!searchable && active >= 0 ? `${id}-o${active}` : undefined}
          >
            {shown.length === 0 && <li className="ddEmpty">—</li>}
            {shown.map((option, index) => {
              const isSelected = String(option.value) === String(value);
              return (
                <li
                  key={`${option.value}`}
                  id={`${id}-o${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  className={`ddOption ${index === active ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                >
                  <span>
                    {option.label}
                    {option.hint && <small>{option.hint}</small>}
                  </span>
                  {isSelected && <Check aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
