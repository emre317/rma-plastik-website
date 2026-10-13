import { Outlet } from 'react-router-dom';

import AdminSidebar from '../components/admin/AdminSidebar';
import QuoteAlerts from '../components/admin/QuoteAlerts';
import { AdminSessionProvider } from '../components/admin/AdminSession';
import useAdminDocumentLanguage from '../hooks/useAdminDocumentLanguage';

export default function AdminLayout() {
  useAdminDocumentLanguage();

  return (
    <AdminSessionProvider>
      <main className="adminPage">
        <AdminSidebar />

        <Outlet />

        <QuoteAlerts />
      </main>
    </AdminSessionProvider>
  );
}
