import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Award, BarChart3, Boxes, Briefcase, CalendarDays, ChevronDown, Camera, Factory, ExternalLink, FileText, Inbox, LayoutDashboard, LogOut, Menu, PlayCircle, Settings, Table2, Type, UserPlus, Users, X, History,
} from 'lucide-react';

import { getMeetingSummary, getUnreadLeadCount, getUnreadQuoteCount } from '../../services/adminApi';
import PublishPanel from './PublishPanel';
import { useAdminSession } from './AdminSession';
import { roleLabel } from './roles';
import BrandLogo from '../BrandLogo';
import {
  MEETINGS_CHANGED_EVENT,
  QUOTES_CHANGED_EVENT,
  clearAdminSession,
  getAdminToken,
  isAuthError,
} from '../../services/adminAuth';

// Hints are shown as a tooltip, so every row has the same height
const NAV = [
  {
    group: '',
    items: [
      { to: '/admin', label: 'Özet', icon: LayoutDashboard, end: true },
    ],
  },
  {
    group: 'Satış',
    collapsible: true,
    items: [
      { to: '/admin/quotes', label: 'Teklif Talepleri', icon: Inbox, badge: true, area: 'sales' },
      { to: '/admin/meetings', label: 'Toplantılar', icon: CalendarDays, hint: 'Yüz yüze ve online toplantı talepleri', badge: 'meetings', area: 'sales' },
      { to: '/admin/quote-reports', label: 'Satış Raporu', icon: BarChart3, hint: 'Ülke, ürün, kanal ve kazanma oranı', area: 'sales' },
      { to: '/admin/leads', label: 'Potansiyel Müşteriler', icon: UserPlus, hint: 'Kataloğu indiren ziyaretçiler', badge: 'leads', area: 'sales' },
    ],
  },
  {
    group: 'Katalog',
    collapsible: true,
    items: [
      { to: '/admin/product-groups', label: 'Ürün Grupları', icon: Boxes, hint: 'Menüdeki ve Ürünler sayfasındaki gruplar', area: 'content' },
      { to: '/admin/product-families', label: 'Ürün Tabloları', icon: Table2, hint: 'Ürün ve su deposu modelleri', area: 'content' },
      { to: '/admin/sectors', label: 'Sektörler', icon: Factory, hint: 'Sektör sayfaları ve sektördeki ürünler', area: 'content' },
    ],
  },
  {
    group: 'İçerik',
    collapsible: true,
    items: [
      { to: '/admin/posts', label: 'Blog Yazıları', icon: FileText, area: 'content' },
      { to: '/admin/projects', label: 'Referans Projeler', icon: Briefcase, hint: 'Özel üretim projeleri', area: 'content' },
      { to: '/admin/certificates', label: 'Sertifikalar', icon: Award, hint: 'Kalite belgeleri ve ISO sertifikaları', area: 'content' },
      { to: '/admin/gallery', label: 'Saha Fotoğrafları', icon: Camera, hint: 'Kullanımdaki ürünler', area: 'content' },
      { to: '/admin/videos', label: 'Videolar', icon: PlayCircle, area: 'content' },
      { to: '/admin/texts', label: 'Sayfa Metinleri', icon: Type, area: 'content' },
    ],
  },
  {
    group: 'Ayarlar',
    collapsible: true,
    items: [
      { to: '/admin/settings', label: 'Site Ayarları', icon: Settings, hint: 'Telefon, e-posta, adres', area: 'settings' },
      { to: '/admin/users', label: 'Kullanıcılar', icon: Users, hint: 'Panel hesapları, roller ve şifreler', area: 'users' },
      { to: '/admin/audit', label: 'İşlem Geçmişi', icon: History, hint: 'Kim, neyi, ne zaman yaptı', area: 'audit' },
    ],
  },
];

// Menu groups open and close with their title; the ones the user closed are
// kept per browser. At first only Ayarlar is closed (v2: new default for all).
const GROUPS_KEY = 'rma_admin_closed_groups_v2';
const DEFAULT_CLOSED = ['Ayarlar'];

function readClosedGroups() {
  try {
    const saved = JSON.parse(localStorage.getItem(GROUPS_KEY) || 'null');
    return Array.isArray(saved) ? saved : DEFAULT_CLOSED;
  } catch {
    return DEFAULT_CLOSED;
  }
}

function saveClosedGroups(list) {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(list));
  } catch {
    // Private mode: the choice lasts for this page only
  }
}

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const token = getAdminToken();
  const { admin, can } = useAdminSession();
  const sales = can('sales');

  // Only the menu items this role may open; empty groups disappear
  const nav = NAV
    .map((section) => ({ ...section, items: section.items.filter((item) => can(item.area)) }))
    .filter((section) => section.items.length);

  const [unread, setUnread] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [pendingMeetings, setPendingMeetings] = useState(0);
  const [open, setOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState(readClosedGroups);

  const toggleGroup = (group) =>
    setClosedGroups((current) => {
      const next = current.includes(group) ? current.filter((item) => item !== group) : [...current, group];
      saveClosedGroups(next);
      return next;
    });

  // Phones: the menu closes after navigation
  useEffect(() => setOpen(false), [pathname]);

  // Re-fetch on navigation so opening a request updates the badge
  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;

    async function loadUnreadCount() {
      try {
        // Unread counts are sales data: other roles do not ask for them
        if (!sales) return;

        const [response, leads, meetings] = await Promise.all([
          getUnreadQuoteCount(token),
          getUnreadLeadCount(token).catch(() => null),
          getMeetingSummary(token).catch(() => null),
        ]);
        if (!cancelled) {
          setUnread(response.data?.unread || 0);
          setNewLeads(leads?.data?.unread || 0);
          setPendingMeetings(meetings?.data?.pending || 0);
        }
      } catch (error) {
        if (!cancelled && isAuthError(error)) {
          clearAdminSession();
          navigate('/admin/login', { replace: true });
        }
        // Other errors: the sidebar should not break
      }
    }

    loadUnreadCount();
    window.addEventListener(QUOTES_CHANGED_EVENT, loadUnreadCount);
    window.addEventListener(MEETINGS_CHANGED_EVENT, loadUnreadCount);

    return () => {
      cancelled = true;
      window.removeEventListener(QUOTES_CHANGED_EVENT, loadUnreadCount);
      window.removeEventListener(MEETINGS_CHANGED_EVENT, loadUnreadCount);
    };
  }, [token, pathname, navigate, sales]);

  function logout() {
    clearAdminSession();
    navigate('/admin/login', { replace: true });
  }

  const initial = (admin?.name || admin?.email || 'A').trim().charAt(0).toLocaleUpperCase('tr');

  return (
    <>
      <div className="adTopbar">
        <BrandLogo variant="light" alt="RMA Plastik" />
        <button type="button" className="adMenuButton" onClick={() => setOpen(true)} aria-label="Menüyü aç">
          <Menu aria-hidden="true" />
          {(unread > 0 || pendingMeetings > 0) && <span className="adDot" aria-hidden="true" />}
        </button>
      </div>

      <div className={`adSidebarBackdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={`adminSidebar adSidebar ${open ? 'open' : ''}`}>
        <div className="adBrand">
          <BrandLogo variant="light" alt="RMA Plastik" />
          <span>Yönetim Paneli</span>
          <a href="/" target="_blank" rel="noreferrer" className="adBrandSite" aria-label="Siteyi Görüntüle" title="Siteyi Görüntüle">
            <ExternalLink aria-hidden="true" />
          </a>
          <button type="button" className="adSidebarClose" onClick={() => setOpen(false)} aria-label="Menüyü kapat">
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="adNav" aria-label="Yönetim menüsü">
          {nav.map((section) => {
            const containsCurrent = section.items.some((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
            // A collapsible group is open when chosen, and always while one of its pages is shown
            const expanded = !section.collapsible || containsCurrent || !closedGroups.includes(section.group);
            const groupId = `adnav-${section.group}`;
            // Unread / waiting counts of the pages inside, shown on a closed group
            const badgeCount = (item) => (item.badge === true ? unread : item.badge === 'meetings' ? pendingMeetings : item.badge === 'leads' ? newLeads : 0);
            const waiting = section.items.reduce((sum, item) => sum + badgeCount(item), 0);

            return (
            <div key={section.group || 'home'} className={`adNavGroup ${section.collapsible ? 'collapsible' : ''} ${expanded ? 'expanded' : ''}`}>
              {section.group && (section.collapsible ? (
                <button
                  type="button"
                  className="adNavLabel adNavToggle"
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  onClick={() => toggleGroup(section.group)}
                  disabled={containsCurrent}
                  title={containsCurrent ? 'Açık sayfa bu grupta' : undefined}
                >
                  <span>{section.group}</span>
                  {!expanded && (waiting > 0
                    ? <span className="adNavBadge" aria-label={`${waiting} bekleyen`}>{waiting}</span>
                    : <span className="adNavCount">{section.items.length}</span>)}
                  <ChevronDown aria-hidden="true" className="adNavChevron" />
                </button>
              ) : <span className="adNavLabel">{section.group}</span>)}
              <div id={section.collapsible ? groupId : undefined} className="adNavItems" hidden={!expanded}>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} title={item.hint} className={({ isActive }) => (isActive ? 'active' : '')}>
                  <item.icon aria-hidden="true" />
                  <span className="adNavText">{item.label}</span>
                  {item.badge === true && unread > 0 && (
                    <span className="adNavBadge" aria-label={`${unread} okunmamış`}>{unread}</span>
                  )}
                  {item.badge === 'meetings' && pendingMeetings > 0 && (
                    <span className="adNavBadge" aria-label={`${pendingMeetings} onay bekliyor`}>{pendingMeetings}</span>
                  )}
                  {item.badge === 'leads' && newLeads > 0 && (
                    <span className="adNavBadge" aria-label={`${newLeads} yeni`}>{newLeads}</span>
                  )}
                </NavLink>
              ))}
              </div>
            </div>
            );
          })}

        </nav>

        <div className="adSidebarFoot">
          {can('content') && <PublishPanel />}

          <div className="adUser">
            <NavLink to="/admin/account" className="adUserLink" title="Hesabım ve şifre">
              <span className="adAvatar" aria-hidden="true">{initial}</span>
              <span className="adUserText">
                <strong>{admin?.name || 'Yönetici'}</strong>
                <small>{roleLabel(admin?.role)}{admin?.email ? ` · ${admin.email}` : ''}</small>
              </span>
            </NavLink>
            <button type="button" onClick={logout} aria-label="Çıkış yap" title="Çıkış yap">
              <LogOut aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
