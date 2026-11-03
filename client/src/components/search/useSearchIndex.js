import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Building2, FileText, GitCompareArrows, Home, Layers, Mail, MessageCircle, Phone, PlayCircle, Table2, Wand2, Wrench, ClipboardList, Droplets, Factory } from 'lucide-react';

import portfolio from '../../data/productPortfolio';
import families, { familyText, modelPath } from '../../data/productTables';
import industries from '../../data/industries';
import { postsForLanguage } from '../../data/posts';
import company from '../../data/company';
import formatNumber from '../../utils/formatNumber';
import useLanguage from '../../hooks/useLanguage';
import { prepare } from './searchEngine';

/* Scopes in the order of the filter tabs */
export const SCOPES = ['groups', 'models', 'sectors', 'pages', 'posts'];

// Static pages: meta.titles.<key> / meta.descriptions.<key> and search.pageKeywords.<key>
const PAGES = [
  { key: 'products', path: '/products', icon: Layers },
  { key: 'waterTanks', path: '/water-tanks', icon: Droplets },
  { key: 'productTables', path: '/product-tables', icon: Table2 },
  { key: 'tankFinder', path: '/tank-finder', icon: Wand2 },
  { key: 'compare', path: '/compare', icon: GitCompareArrows },
  { key: 'customMolding', path: '/custom-molding', icon: Wrench },
  { key: 'customProject', path: '/custom-molding/project', icon: ClipboardList, weight: 1.15 },
  { key: 'industries', path: '/industries', icon: Factory },
  { key: 'company', path: '/company', icon: Building2 },
  { key: 'contact', path: '/contact', icon: MessageCircle },
  { key: 'blog', path: '/blog', icon: BookOpen },
  { key: 'videos', path: '/videos', icon: PlayCircle },
  { key: 'home', path: '/', icon: Home, weight: 0.6 },
];

const list = (value) => (Array.isArray(value) ? value : []);
const words = (value) => String(value || '').split(/[,;]\s*|\s+/).filter(Boolean);

/* Main sizes of a model as short chips: "Ø 190 cm", "212 cm" */
function sizeChips(row, t) {
  const chips = [];
  const cm = t('search.units.cm');
  if (typeof row.diameter === 'number') chips.push(`Ø ${row.diameter} ${cm}`);
  if (typeof row.length === 'number' && typeof row.width === 'number') chips.push(`${row.length} × ${row.width} ${cm}`);
  if (typeof row.height === 'number') chips.push(`↕ ${row.height} ${cm}`);
  return chips.slice(0, 2);
}

/*
  Everything the search can find, in the site language: product groups and
  tables, every catalogue model, sectors, pages, blog posts and the direct
  contact channels. Built once per language.
*/
export default function useSearchIndex() {
  const { t } = useTranslation();
  const { code: lang } = useLanguage();

  return useMemo(() => {
    const entries = [];
    const groupTitles = new Set();

    portfolio.forEach((group) => {
      const item = (field) => t(`productExplorer.items.${group.id}.${field}`, { defaultValue: '' });
      const title = item('title') || item('label');
      groupTitles.add(title.toLocaleLowerCase(lang));

      const range = group.minVolume && group.maxVolume
        ? group.minVolume === group.maxVolume
          ? `${formatNumber(group.minVolume, lang)} L`
          : `${formatNumber(group.minVolume, lang)} – ${formatNumber(group.maxVolume, lang)} L`
        : '';

      entries.push({
        id: `group:${group.id}`,
        type: 'groups',
        title,
        subtitle: item('application'),
        text: item('description'),
        keywords: [item('label'), ...group.members.map((family) => familyText(family, 'title', lang, t))],
        image: group.image,
        url: group.link,
        meta: [
          group.custom
            ? t('productExplorer.projectBased')
            : group.quoteOnly
              ? t('productExplorer.onRequest')
              : t('search.modelCount', { count: group.models }),
          range,
        ].filter(Boolean),
        weight: 1.1,
      });
    });

    families.forEach((family) => {
      const title = familyText(family, 'title', lang, t);
      const groupTitle = family.group ? t(`productExplorer.items.${family.group}.label`, { defaultValue: '' }) : '';
      const volumes = family.rows.map((row) => row.volume).filter((value) => typeof value === 'number');

      // A table with the same name as its group is already listed
      if (title && !groupTitles.has(title.toLocaleLowerCase(lang))) {
        entries.push({
          id: `family:${family.id}`,
          type: 'groups',
          title,
          subtitle: groupTitle,
          text: familyText(family, 'text', lang, t),
          image: family.image,
          url: `/product-tables#${family.id}`,
          meta: [
            family.rows.length ? t('search.modelCount', { count: family.rows.length }) : t('productExplorer.onRequest'),
            volumes.length > 1 ? `${formatNumber(Math.min(...volumes), lang)} – ${formatNumber(Math.max(...volumes), lang)} L` : '',
          ].filter(Boolean),
        });
      }

      family.rows.forEach((row) => {
        entries.push({
          id: `model:${family.id}:${row.slug}`,
          type: 'models',
          title: String(row.code),
          code: String(row.code),
          subtitle: title,
          keywords: [groupTitle],
          image: row.image || family.image,
          url: modelPath(family, row),
          volume: typeof row.volume === 'number' ? row.volume : undefined,
          meta: [
            typeof row.volume === 'number' ? `${formatNumber(row.volume, lang)} L` : '',
            ...sizeChips(row, t),
          ].filter(Boolean),
          payload: { family: family.id, row: row.slug },
          weight: 0.95,
        });
      });
    });

    const sectorTexts = list(t('industries.items', { returnObjects: true }));
    industries.forEach((sector, index) => {
      const text = sectorTexts[index];
      if (!text?.title) return;

      entries.push({
        id: `sector:${sector.slug}`,
        type: 'sectors',
        title: text.title,
        subtitle: list(text.products).slice(0, 4).join(' · '),
        text: text.description,
        keywords: list(text.products),
        icon: sector.icon,
        hue: sector.hue,
        url: `/industries/${sector.slug}`,
      });
    });

    PAGES.forEach((page) => {
      const title = page.key === 'customProject'
        ? t('project.meta.title')
        : page.key === 'home' ? t('nav.home') : t(`meta.titles.${page.key}`);
      const text = page.key === 'customProject' ? t('project.meta.description') : t(`meta.descriptions.${page.key}`, { defaultValue: '' });

      entries.push({
        id: `page:${page.key}`,
        type: 'pages',
        title,
        text,
        keywords: words(t(`search.pageKeywords.${page.key}`, { defaultValue: '' })),
        icon: page.icon,
        url: page.path,
        weight: page.weight || 1,
      });
    });

    // Direct contact: call, write, WhatsApp
    entries.push(
      {
        id: 'contact:phone', type: 'pages', title: company.phone.display, subtitle: t('search.contact.phone'),
        keywords: words(t('search.contact.phoneKeywords')), icon: Phone, href: company.phone.href, ltr: true,
      },
      {
        id: 'contact:email', type: 'pages', title: company.email, subtitle: t('search.contact.email'),
        keywords: words(t('search.contact.emailKeywords')), icon: Mail, href: `mailto:${company.email}`, ltr: true,
      }
    );

    if (company.whatsapp) {
      entries.push({
        id: 'contact:whatsapp', type: 'pages', title: 'WhatsApp', subtitle: t('search.contact.whatsapp'),
        keywords: words(t('search.contact.whatsappKeywords')), icon: MessageCircle,
        href: `https://wa.me/${company.whatsapp}`, external: true,
      });
    }

    postsForLanguage(lang).forEach((post) => {
      const text = post.i18n?.[lang] || {};
      entries.push({
        id: `post:${post.slug}`,
        type: 'posts',
        title: text.title,
        text: text.excerpt,
        image: post.coverImage || '',
        icon: FileText,
        url: `/blog/${post.slug}`,
        weight: 0.9,
      });
    });

    return prepare(entries.filter((entry) => entry.title));
  }, [t, lang]);
}
