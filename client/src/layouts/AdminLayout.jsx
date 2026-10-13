import { Outlet } from 'react-router-dom';

import AdminSidebar from '../components/admin/AdminSidebar';
import { AdminSessionProvider } from '../components/admin/AdminSession';
import useAdminDocumentLanguage from '../hooks/useAdminDocumentLanguage';

export default function AdminLayout() {
  useAdminDocumentLanguage();

  return (
    <AdminSessionProvider>
      <main className="adminPage">
        <AdminSidebar />

        <Outlet />
      </main>
    </AdminSessionProvider>
  );
}
