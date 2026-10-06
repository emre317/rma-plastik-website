import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { findModel } from '../../data/productTables';

/*
  Models picked for comparison (max. 4), kept in the browser.
  A model is addressed as "<family id>/<model slug>".
*/
const CompareContext = createContext(null);

const STORAGE_KEY = 'rma_compare';
export const MAX_COMPARE = 4;

export const compareKey = (family, row) => `${family.id}/${row.slug}`;

export function resolveCompareKeys(keys) {
  return keys
    .map((key) => {
      const [familyId, slug] = String(key).split('/');
      const match = findModel(familyId, slug);
      return match ? { key, ...match } : null;
    })
    .filter(Boolean);
}

export function CompareProvider({ children }) {
  const [keys, setKeys] = useState([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved)) setKeys(resolveCompareKeys(saved).map((item) => item.key).slice(0, MAX_COMPARE));
    } catch {
      // storage blocked: comparison lasts for this visit only
    }
  }, []);

  const save = useCallback((next) => {
    setKeys(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const toggleCompare = useCallback(
    (key) => {
      if (keys.includes(key)) {
        save(keys.filter((item) => item !== key));
        return true;
      }

      if (keys.length >= MAX_COMPARE) {
        setNotice('full');
        setTimeout(() => setNotice(''), 3000);
        return false;
      }

      save([...keys, key]);
      return true;
    },
    [keys, save]
  );

  const setCompare = useCallback((next) => save(next.slice(0, MAX_COMPARE)), [save]);
  const clearCompare = useCallback(() => save([]), [save]);
  const isCompared = useCallback((key) => keys.includes(key), [keys]);

  const value = useMemo(
    () => ({ keys, toggleCompare, setCompare, clearCompare, isCompared, notice }),
    [keys, toggleCompare, setCompare, clearCompare, isCompared, notice]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) throw new Error('useCompare must be used inside CompareProvider');
  return context;
}
