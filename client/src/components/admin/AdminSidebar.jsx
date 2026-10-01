import { useEffect, useState } from 'react';
import {
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  getUnreadQuoteCount,
} from '../../services/adminApi';

import {
  QUOTES_CHANGED_EVENT,
  clearAdminSession,
  getAdminToken,
  getAdminUser,
  isAuthError,
} from '../../services/adminAuth';

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const token = getAdminToken();
  const admin = getAdminUser();

  const [unread, setUnread] = useState(0);

  // Re-fetch on navigation so opening a request updates the badge
  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;

    async function loadUnreadCount() {
      try {
        const response =
          await getUnreadQuoteCount(token);

        if (!cancelled) {
          setUnread(
            response.data?.unread || 0
          );
        }
      } catch (error) {
        if (!cancelled && isAuthError(error)) {
          clearAdminSession();
          navigate('/admin/login', { replace: true });
        }
        // Other errors: sidebar should not break
      }
    }

    loadUnreadCount();

    window.addEventListener(
      QUOTES_CHANGED_EVENT,
      loadUnreadCount
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        QUOTES_CHANGED_EVENT,
        loadUnreadCount
      );
    };
  }, [token, pathname, navigate]);

  function logout() {
    clearAdminSession();

    navigate('/admin/login', { replace: true });
  }

  return (
    <aside className="adminSidebar">

      <div className="adminLogo">
        <span>RMA</span>
        <small>ADMIN</small>
      </div>

      <nav>

        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            isActive ? 'active' : ''
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/admin/quotes"
          className={({ isActive }) =>
            isActive ? 'active' : ''
          }
        >
          <span>
            Quote Requests
          </span>

          {unread > 0 && (
            <span
              className="adminSidebarBadge"
              aria-label={`${unread} unread`}
            >
              {unread}
            </span>
          )}
        </NavLink>

        <NavLink to="/">
          View Website
        </NavLink>

      </nav>

      {admin?.email && (
        <span className="adminSidebarUser">
          {admin.email}
        </span>
      )}

      <button
        type="button"
        onClick={logout}
      >
        Log Out
      </button>

    </aside>
  );
}
