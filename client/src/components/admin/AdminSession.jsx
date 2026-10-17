import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

import { getCurrentAdmin } from '../../services/adminApi';
import { getAdminToken, getAdminUser, saveAdminSession } from '../../services/adminAuth';
import { can as roleCan } from './roles';

const AdminSessionContext = createContext({ admin: null, can: () => true, updateAdmin: () => {} });

const sessionUser = (data) => ({
  id: data._id || data.id,
  name: data.name,
  email: data.email,
  phone: data.phone || '',
  title: data.title || '',
  role: data.role || 'admin',
});

/*
  Signed-in user for the panel. The stored user is shown at once, then
  refreshed from the server, so a role changed by another admin applies
  without signing in again. updateAdmin() applies your own edited details.
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
        const user = sessionUser(fresh);
        saveAdminSession(getAdminToken() || token, user);
        setAdmin(user);
      })
      .catch(() => {
        // Expired sessions are handled by the pages (useAdminApi)
      });
  }, []);

  const updateAdmin = useCallback((data) => {
    setAdmin((current) => {
      const user = { ...sessionUser({ ...current, ...data }), role: current?.role || data.role || 'admin' };
      const token = getAdminToken();
      if (token) saveAdminSession(token, user);
      return user;
    });
  }, []);

  const value = useMemo(() => ({ admin, can: (area) => roleCan(admin?.role, area), updateAdmin }), [admin, updateAdmin]);

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export const useAdminSession = () => useContext(AdminSessionContext);
