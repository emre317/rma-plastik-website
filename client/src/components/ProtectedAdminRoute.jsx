import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { hasValidAdminSession } from '../services/adminAuth';

export default function ProtectedAdminRoute() {
  const location = useLocation();

  if (!hasValidAdminSession()) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}
