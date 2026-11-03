import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown, ArrowUp, Check, ClipboardList, Clock, CornerDownLeft, FileText, MessageSquareQuote, Plus, Search, Sparkles,
  Table2, Wand2, X,
} from 'lucide-react';

import Arrow from '../i18n/Arrow';
import useLanguage from '../../hooks/useLanguage';
import useModelQuote from '../../hooks/useModelQuote';
import { localizePath } from '../../i18n/languages';
import { findModel } from '../../data/productTables';
import { useQuote } from '../quote/QuoteContext';
import { track } from '../../analytics/track';
import useSearchIndex, { SCOPES } from './useSearchIndex';
import { highlight, runSearch } from './searchEngine';

const RECENT_KEY = 'rma_search_recent';
const MAX_RECENT = 6;
const SECTION_LIMIT = { models: 6, groups: 4, sectors: 3, pages: 4, posts: 3 };
const SCOPE_LIMIT = 40;

function readRecent() {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function writeRecent(list) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: recent searches live for this visit only
  }
}

function Highlighted({ text, query }) {
  return highlight(text, query).map((part, index) =>
    part.match ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>
  );
}

/* Photo, or the entry's icon on a tinted tile */
function Thumb({ entry }) {
  const Icon = entry.icon || FileText;

  if (entry.image) {
    return (
      <span className={`srThumb ${entry.type === 'models' ? 'isProduct' : ''}`}>
        <img src={entry.image} alt="" loading="lazy" decoding="async" />
      </span>
    );
  }

  return (
    <span className={`srThumb isIcon srTone-${entry.type}`} style={entry.hue !== undefined ? { '--sr-hue': entry.hue } : undefined}>
      <Icon aria-hidden="true" />
    </span>
  );
}

/*
  Search dialog (command palette): one field, results grouped by type,
  arrow keys + Enter, filter tabs, recent and popular searches, and
  catalogue models can go straight onto the quote list.
*/
export default function SearchDialog({ open, initialQuery = '', onClose }) {
  const { t } = useTranslation();
  const { code: lang, dir } = useLanguage();
  const navigate = useNavigate();
  const index = useSearchIndex();
  const quoteForModel = useModelQuote();
  const { addToCart, removeFromCart, inCart, openQuote } = useQuote();

  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState('all');
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState([]);
  const deferredQuery = useDeferredValue(query);

  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const listId = useId();

  const s = (key, options) => t(`search.${key}`, options);
  const synonyms = useMemo(() => {
    const value = t('search.synonyms', { returnObjects: true });
    return Array.isArray(value) ? value.filter(Array.isArray) : [];
  }, [t]);
  const popular = useMemo(() => {
    const value = t('search.popularTerms', { returnObjects: true });
    return Array.isArray(value) ? value : [];
  }, [t]);

  // Fresh field each time the dialog opens
  useEffect(() => {
    if (!open) return undefined;
    setQuery(initialQuery);
    setScope('all');
    setActive(0);
    setRecent(readRecent());
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open, initialQuery]);

  const trimmed = deferredQuery.trim();
  const results = useMemo(() => (trimmed ? runSearch(index, trimmed, { synonyms }) : []), [index, trimmed, synonyms]);

  const counts = useMemo(() => {
    const value = { all: results.length };
    SCOPES.forEach((key) => { value[key] = 0; });
    results.forEach(({ entry }) => { value[entry.type] += 1; });
    return value;
  }, [results]);

  // Sections ordered by their best result; a filter tab shows one type only
  const sections = useMemo(() => {
    const byType = {};
    results.forEach((result) => {
      (byType[result.entry.type] ||= []).push(result);
    });

    if (scope !== 'all') {
      return byType[scope] ? [{ type: scope, items: byType[scope].slice(0, SCOPE_LIMIT), total: byType[scope].length }] : [];
    }

    return Object.entries(byType)
      .map(([type, items]) => ({ type, items: items.slice(0, SECTION_LIMIT[type] || 4), total: items.length, best: items[0].score }))
      .sort((a, b) => b.best - a.best);
  }, [results, scope]);

  const flat = useMemo(() => sections.flatMap((section) => section.items.map((item) => item.entry)), [sections]);

  useEffect(() => setActive(0), [trimmed, scope]);

  // The active row stays in view
  useEffect(() => {
    const element = bodyRef.current?.querySelector(`[data-index="${active}"]`);
    element?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  // Scroll lock, focus trap and returning focus
  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input')]
          .filter((element) => element.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  function remember(term) {
    const value = term.trim();
    if (value.length < 2) return;
    const next = [value, ...readRecent().filter((item) => item.toLocaleLowerCase(lang) !== value.toLocaleLowerCase(lang))].slice(0, MAX_RECENT);
    writeRecent(next);
    setRecent(next);
  }

  function select(entry, position) {
    remember(query);
    track('search', { search_term: query.trim(), results: results.length });
    track('search_select', { search_term: query.trim(), item_type: entry.type, item_id: entry.id, position: position + 1 });

    if (entry.href) {
      if (entry.external) window.open(entry.href, '_blank', 'noopener');
      else window.location.href = entry.href;
      onClose();
      return;
    }

    onClose();
    navigate(localizePath(entry.url, lang));
  }

  function modelOf(entry) {
    const found = entry.payload && findModel(entry.payload.family, entry.payload.row);
    return found ? quoteForModel(found.family, found.row) : null;
  }

  function toggleQuote(entry) {
    const model = modelOf(entry);
    if (!model) return;
    if (inCart(model.name)) {
      removeFromCart(model.name);
    } else {
      addToCart(model);
      track('search_add_to_quote', { item_id: entry.id });
    }
  }

  function onInputKeyDown(event) {
    if (!flat.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % flat.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current - 1 + flat.length) % flat.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (flat[active]) select(flat[active], active);
    }
  }

  function runTerm(term) {
    setQuery(term);
    inputRef.current?.focus();
  }

  function askSales() {
    track('search_no_results_quote', { search_term: query.trim() });
    remember(query);
    onClose();
    openQuote(query.trim().slice(0, 150));
  }

  function goTo(path, event) {
    event?.preventDefault();
    onClose();
    navigate(localizePath(path, lang));
  }

  const showResults = Boolean(trimmed);
  let position = -1;

  return (
    <div className={`srOverlay ${open ? 'open' : ''}`} aria-hidden={!open} inert={!open} dir={dir}>
      <div className="srBackdrop" onClick={onClose} />

      <div className="srDialog" role="dialog" aria-modal="true" aria-label={s('dialogLabel')} ref={dialogRef}>
        <div className="srHead">
          <Search className="srHeadIcon" aria-hidden="true" />
          <input
            ref={inputRef}
            className="srInput"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            maxLength={80}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={s('placeholder')}
            aria-label={s('dialogLabel')}
            role="combobox"
            aria-expanded={showResults && flat.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showResults && flat[active] ? `${listId}-${active}` : undefined}
          />
          {query && (
            <button type="button" className="srClear" onClick={() => runTerm('')} aria-label={s('clear')}>
              <X aria-hidden="true" />
            </button>
          )}
          <button type="button" className="srClose" onClick={onClose}>
            <kbd>Esc</kbd>
            <span>{s('close')}</span>
          </button>
        </div>

        {showResults && results.length > 0 && (
          <div className="srScopes" role="tablist" aria-label={s('filterLabel')}>
            {['all', ...SCOPES].filter((key) => key === 'all' || counts[key]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={scope === key}
                className={scope === key ? 'active' : ''}
                onClick={() => { setScope(key); inputRef.current?.focus(); }}
              >
                {s(`scopes.${key}`)}
                <span>{counts[key]}</span>
              </button>
            ))}
          </div>
        )}

        <div className="srBody" ref={bodyRef}>
          {!showResults && (
            <div className="srStart">
              {recent.length > 0 && (
                <section className="srBlock">
                  <header className="srBlockHead">
                    <h3>{s('recent')}</h3>
                    <button type="button" className="srLinkButton" onClick={() => { writeRecent([]); setRecent([]); }}>
                      {s('clearRecent')}
                    </button>
                  </header>
                  <ul className="srChips">
                    {recent.map((term) => (
                      <li key={term}>
                        <button type="button" onClick={() => runTerm(term)}>
                          <Clock aria-hidden="true" />
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="srBlock">
                <header className="srBlockHead"><h3>{s('popular')}</h3></header>
                <ul className="srChips">
                  {popular.map((term) => (
                    <li key={term}>
                      <button type="button" onClick={() => runTerm(term)}>
                        <Search aria-hidden="true" />
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="srBlock">
                <header className="srBlockHead"><h3>{s('quickAccess')}</h3></header>
                <ul className="srTiles">
                  <li>
                    <a href={localizePath('/tank-finder', lang)} onClick={(event) => goTo('/tank-finder', event)}>
                      <span className="srTileIcon"><Wand2 aria-hidden="true" /></span>
                      <strong>{t('meta.titles.tankFinder')}</strong>
                      <small>{s('tiles.finder')}</small>
                    </a>
                  </li>
                  <li>
                    <a href={localizePath('/product-tables', lang)} onClick={(event) => goTo('/product-tables', event)}>
                      <span className="srTileIcon"><Table2 aria-hidden="true" /></span>
                      <strong>{t('meta.titles.productTables')}</strong>
                      <small>{s('tiles.tables')}</small>
                    </a>
                  </li>
                  <li>
                    <a href={localizePath('/custom-molding/project', lang)} onClick={(event) => goTo('/custom-molding/project', event)}>
                      <span className="srTileIcon"><ClipboardList aria-hidden="true" /></span>
                      <strong>{t('project.meta.title')}</strong>
                      <small>{s('tiles.project')}</small>
                    </a>
                  </li>
                  <li>
                    <button type="button" onClick={() => { onClose(); openQuote(); }}>
                      <span className="srTileIcon isAccent"><MessageSquareQuote aria-hidden="true" /></span>
                      <strong>{t('common.requestQuote')}</strong>
                      <small>{s('tiles.quote')}</small>
                    </button>
                  </li>
                </ul>
              </section>
            </div>
          )}

          {showResults && results.length > 0 && (
            <div id={listId} role="listbox" aria-label={s('resultsLabel')} className="srResults">
              {sections.map((section) => (
                <section key={section.type} className="srSection" role="group" aria-label={s(`scopes.${section.type}`)}>
                  <header className="srSectionHead">
                    <h3>{s(`scopes.${section.type}`)}</h3>
                    {scope === 'all' && section.total > section.items.length && (
                      <button type="button" className="srLinkButton" onClick={() => { setScope(section.type); inputRef.current?.focus(); }}>
                        {s('showAll', { count: section.total })}
                        <Arrow />
                      </button>
                    )}
                  </header>

                  <ul>
                    {section.items.map(({ entry, volumeMatch }) => {
                      position += 1;
                      const index = position;
                      const isActive = index === active;
                      const model = entry.type === 'models' ? modelOf(entry) : null;
                      const added = model ? inCart(model.name) : false;

                      return (
                        <li
                          key={entry.id}
                          id={`${listId}-${index}`}
                          role="option"
                          aria-selected={isActive}
                          data-index={index}
                          className={`srItem ${isActive ? 'active' : ''} srItem-${entry.type}`}
                          onMouseMove={() => { if (!isActive) setActive(index); }}
                        >
                          <a
                            href={entry.href || localizePath(entry.url, lang)}
                            className="srItemLink"
                            tabIndex={-1}
                            onClick={(event) => { event.preventDefault(); select(entry, index); }}
                          >
                            <Thumb entry={entry} />
                            <span className="srItemText">
                              <strong dir={entry.ltr ? 'ltr' : undefined}><Highlighted text={entry.title} query={trimmed} /></strong>
                              {(entry.subtitle || entry.text) && (
                                <small><Highlighted text={entry.subtitle || entry.text} query={trimmed} /></small>
                              )}
                            </span>
                            {entry.meta?.length > 0 && (
                              <span className="srMeta">
                                {entry.meta.map((item, i) => (
                                  <span key={item} dir="auto" className={i === 0 && volumeMatch ? 'isMatch' : ''}>{item}</span>
                                ))}
                              </span>
                            )}
                            <span className="srEnter" aria-hidden="true"><CornerDownLeft /></span>
                          </a>

                          {model && (
                            <button
                              type="button"
                              className={`srAdd ${added ? 'added' : ''}`}
                              onClick={() => toggleQuote(entry)}
                              aria-pressed={added}
                              aria-label={`${added ? s('inQuote') : s('addToQuote')}: ${entry.title}`}
                              title={added ? s('inQuote') : s('addToQuote')}
                            >
                              {added ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                              <span>{added ? s('inQuoteShort') : s('addToQuoteShort')}</span>
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {showResults && results.length === 0 && (
            <div className="srEmpty">
              <span className="srEmptyIcon" aria-hidden="true"><Sparkles /></span>
              <h3>{s('noResultsTitle', { query: trimmed })}</h3>
              <p>{s('noResultsText')}</p>
              <div className="srEmptyActions">
                <a
                  href={localizePath('/custom-molding/project', lang)}
                  className="button primary"
                  onClick={(event) => { remember(query); goTo('/custom-molding/project', event); }}
                >
                  <span>{s('startProject')}</span>
                  <Arrow className="buttonArrow" />
                </a>
                <button type="button" className="button ghost" onClick={askSales}>
                  <span>{s('askSales')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="srFoot">
          <span className="srKeys">
            <span><kbd><ArrowUp aria-hidden="true" /></kbd><kbd><ArrowDown aria-hidden="true" /></kbd>{s('keys.navigate')}</span>
            <span><kbd><CornerDownLeft aria-hidden="true" /></kbd>{s('keys.open')}</span>
            <span><kbd>Esc</kbd>{s('keys.close')}</span>
          </span>
          <span className="srCount" role="status" aria-live="polite">
            {showResults ? s('resultCount', { count: results.length }) : s('indexSize', { count: index.length })}
          </span>
        </footer>
      </div>
    </div>
  );
}
