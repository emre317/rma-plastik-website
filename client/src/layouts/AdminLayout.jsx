import { Outlet } from 'react-router-dom';

import AdminSidebar from '../components/admin/AdminSidebar';
import useAdminDocumentLanguage from '../hooks/useAdminDocumentLanguage';

export default function AdminLayout() {
  useAdminDocumentLanguage();

  return (
    <main className="adminPage">
      <AdminSidebar />

      <Outlet />
    </main>
  );
}