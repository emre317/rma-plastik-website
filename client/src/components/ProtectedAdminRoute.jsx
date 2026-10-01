import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedAdminRoute() {
  const token = localStorage.getItem('rma_admin_token');

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}