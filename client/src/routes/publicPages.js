import { lazy } from 'react';

import { prefetchLanguages } from '../i18n';

/*
  Public pages, each in its own file (code splitting): a visitor downloads only
  the page they open. The prerendered HTML is shown and hydrated while the page
  file loads, so nothing flashes. After the first page the others are fetched
  in the background (prefetchPages) to keep navigation instant.
*/
const loaders = {
  Home: () => import('../pages/Home/Home'),
  Company: () => import('../pages/Company/Company'),
  Products: () => import('../pages/Products/Products'),
  ProductDetail: () => import('../pages/ProductDetail/ProductDetail'),
  WaterTanks: () => import('../pages/WaterTanks/WaterTanks'),
  ProductTables: () => import('../pages/ProductTables/ProductTables'),
  ProductModel: () => import('../pages/ProductModel/ProductModel'),
  ProductDatasheet: () => import('../pages/ProductDatasheet/ProductDatasheet'),
  Compare: () => import('../pages/Compare/Compare'),
  TankFinder: () => import('../pages/TankFinder/TankFinder'),
  CustomMolding: () => import('../pages/CustomMolding/CustomMolding'),
  Industries: () => import('../pages/Industries/Industries'),
  IndustryDetail: () => import('../pages/IndustryDetail/IndustryDetail'),
  Contact: () => import('../pages/Contact/Contact'),
  Blog: () => import('../pages/Blog/Blog'),
  BlogPost: () => import('../pages/BlogPost/BlogPost'),
  Videos: () => import('../pages/Videos/Videos'),
  NotFound: () => import('../pages/NotFound/NotFound'),
};

export const pages = Object.fromEntries(Object.entries(loaders).map(([name, load]) => [name, lazy(load)]));

let prefetched = false;

/* Loads every page file when the browser is idle (skipped with data saver) */
export function prefetchPages() {
  if (prefetched || typeof window === 'undefined' || navigator.connection?.saveData) return;
  prefetched = true;

  prefetchLanguages();

  const idle = window.requestIdleCallback || ((callback) => setTimeout(callback, 1500));
  const queue = Object.values(loaders);

  const next = () => {
    const load = queue.shift();
    if (!load) return;
    load().catch(() => {}).finally(() => idle(next, { timeout: 4000 }));
  };

  idle(next, { timeout: 4000 });
}
