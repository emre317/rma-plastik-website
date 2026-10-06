import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { clearAdminSession, getAdminToken, isAuthError } from '../services/adminAuth';

/*
  Runs an admin API call with the stored token; an expired session sends the
  user back to the login page instead of showing a broken screen.
    const call = useAdminApi();
    const data = await call(listProducts);
*/
export default function useAdminApi() {
  const navigate = useNavigate();

  return useCallback(
    async (fn, ...args) => {
      const token = getAdminToken();

      if (!token) {
        navigate('/admin/login', { replace: true });
        throw new Error('Oturum bulunamadı.');
      }

      try {
        return await fn(...args, token);
      } catch (error) {
        if (isAuthError(error)) {
          clearAdminSession();
          navigate('/admin/login', { replace: true });
        }

        throw error;
      }
    },
    [navigate]
  );
}
