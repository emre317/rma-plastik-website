import { useEffect, useState } from 'react';
import {
  NavLink,
  useNavigate,
} from 'react-router-dom';

import {
  getUnreadQuoteCount,
} from '../../services/adminApi';

export default function AdminSidebar() {
  const navigate = useNavigate();

  const token = localStorage.getItem(
    'rma_admin_token'
  );

  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function loadUnreadCount() {
      try {
        const response =
          await getUnreadQuoteCount(token);

        setUnread(
          response.data?.unread || 0
        );
      } catch {
        // Sidebar should not break
      }
    }

    loadUnreadCount();
  }, [token]);

  function logout() {
    localStorage.removeItem(
      'rma_admin_token'
    );

    localStorage.removeItem(
      'rma_admin_user'
    );

    navigate('/admin/login');
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
            <span className="adminSidebarBadge">
              {unread}
            </span>
          )}
        </NavLink>

        <NavLink to="/">
          View Website
        </NavLink>

      </nav>

      <button
        type="button"
        onClick={logout}
      >
        Log Out
      </button>

    </aside>
  );
}