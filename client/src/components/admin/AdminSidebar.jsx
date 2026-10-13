import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, Briefcase, Camera, CircleHelp, ExternalLink, Globe2, FileText, Inbox, LayoutDashboard, LogOut, Menu, PlayCircle, Settings, Table2, Type, UserPlus, Users, X,
} from 'lucide-react';

import { getUnreadLeadCount, getUnreadQuoteCount } from '../../services/adminApi';
import PublishPanel from './PublishPanel';
import BrandLogo from '../BrandLogo';
import {
  QUOTES_CHANGED_EVENT,
  clearAdminSession,
  getAdminToken,
  getAdminUser,
  isAuthError,
} from '../../services/adminAuth';

// Hints are shown as a tooltip, so every row has the same height
const NAV = [
  {
    group: 'Satış',
    items: [
      { to: '/admin', label: 'Özet', icon: LayoutDashboard, end: true },
      { to: '/admin/quotes', label: 'Teklif Talepleri', icon: Inbox, badge: true },
      { to: '/admin/quote-reports', label: 'Satış Raporu', icon: BarChart3, hint: 'Ülke, ürün, kanal ve kazanma oranı' },
      { to: '/admin/leads', label: 'Potansiyel Müşteriler', icon: UserPlus, hint: 'Kataloğu indiren ziyaretçiler', badge: 'leads' },
    ],
  },
  {
    group: 'Katalog',
    items: [
      { to: '/admin/product-families', label: 'Ürün Tabloları', icon: Table2, hint: 'Ürün ve su deposu modelleri' },
      { to: '/admin/export-markets', label: 'İhracat Ağı', icon: Globe2, hint: 'Haritadaki pazarlar' },
    ],
  },
  {
    group: 'İçerik',
    items: [
      { to: '/admin/posts', label: 'Blog Yazıları', icon: FileText },
      { to: '/admin/projects', label: 'Referans Projeler', icon: Briefcase, hint: 'Özel üretim projeleri' },
      { to: '/admin/gallery', label: 'Saha Fotoğrafları', icon: Camera, hint: 'Kullanımdaki ürünler' },
      { to: '/admin/faqs', label: 'Sık Sorulan Sorular', icon: CircleHelp, hint: 'SSS sayfası' },
      { to: '/admin/videos', label: 'Videolar', icon: PlayCircle },
      { to: '/admin/texts', label: 'Sayfa Metinleri', icon: Type },
    ],
  },
  {
    group: 'Ayarlar',
    items: [
      { to: '/admin/settings', label: 'Site Ayarları', icon: Settings, hint: 'Telefon, e-posta, adres' },
      { to: '/admin/users', label: 'Kullanıcılar', icon: Users, hint: 'Panel hesapları ve şifreler' },
    ],
  },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const token = getAdminToken();
  const admin = getAdminUser();

  const [unread, setUnread] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [open, setOpen] = useState(false);

  // Phones: the menu closes after navigation
  useEffect(() => setOpen(false), [pathname]);

  // Re-fetch on navigation so opening a request updates the badge
  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;

    async function loadUnreadCount() {
      try {
        const [response, leads] = await Promise.all([
          getUnreadQuoteCount(token),
          getUnreadLeadCount(token).catch(() => null),
        ]);
        if (!cancelled) {
          setUnread(response.data?.unread || 0);
          setNewLeads(leads?.data?.unread || 0);
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

    return () => {
      cancelled = true;
      window.removeEventListener(QUOTES_CHANGED_EVENT, loadUnreadCount);
    };
  }, [token, pathname, navigate]);

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
          {unread > 0 && <span className="adDot" aria-hidden="true" />}
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
          {NAV.map((section) => (
            <div key={section.group} className="adNavGroup">
              <span className="adNavLabel">{section.group}</span>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} title={item.hint} className={({ isActive }) => (isActive ? 'active' : '')}>
                  <item.icon aria-hidden="true" />
                  <span className="adNavText">{item.label}</span>
                  {item.badge === true && unread > 0 && (
                    <span className="adNavBadge" aria-label={`${unread} okunmamış`}>{unread}</span>
                  )}
                  {item.badge === 'leads' && newLeads > 0 && (
                    <span className="adNavBadge" aria-label={`${newLeads} yeni`}>{newLeads}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}

        </nav>

        <div className="adSidebarFoot">
          <PublishPanel />

          <div className="adUser">
            <NavLink to="/admin/users" className="adUserLink" title="Hesabım ve şifre">
              <span className="adAvatar" aria-hidden="true">{initial}</span>
              <span className="adUserText">
                <strong>{admin?.name || 'Yönetici'}</strong>
                {admin?.email && <small>{admin.email}</small>}
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
