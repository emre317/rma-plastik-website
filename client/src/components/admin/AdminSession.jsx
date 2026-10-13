import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getCurrentAdmin } from '../../services/adminApi';
import { getAdminToken, getAdminUser, saveAdminSession } from '../../services/adminAuth';
import { can as roleCan } from './roles';

const AdminSessionContext = createContext({ admin: null, can: () => true });

/*
  Signed-in user for the panel. The stored user is shown at once, then
  refreshed from the server, so a role changed by another admin applies
  without signing in again.
*/
export function AdminSessionProvider({ children }) {
  const [admin, setAdmin] = useState(getAdminUser);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;

    getCurrentAdmin(token)
      .then((response) => {
        const fresh = response.admin;
        if (!fresh) return;
        const user = { id: fresh._id || fresh.id, name: fresh.name, email: fresh.email, role: fresh.role || 'admin' };
        saveAdminSession(getAdminToken() || token, user);
        setAdmin(user);
      })
      .catch(() => {
        // Expired sessions are handled by the pages (useAdminApi)
      });
  }, []);

  const value = useMemo(() => ({ admin, can: (area) => roleCan(admin?.role, area) }), [admin]);

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export const useAdminSession = () => useContext(AdminSessionContext);
