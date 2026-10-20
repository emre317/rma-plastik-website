import { Outlet } from 'react-router-dom';

import AdminSidebar from '../components/admin/AdminSidebar';
import QuoteAlerts from '../components/admin/QuoteAlerts';
import { AdminSessionProvider } from '../components/admin/AdminSession';
import useAdminDocumentLanguage from '../hooks/useAdminDocumentLanguage';
import useNoticeScroll from '../hooks/useNoticeScroll';

export default function AdminLayout() {
  useAdminDocumentLanguage();
  // A new success / error message scrolls into view (usually: back to the top)
  useNoticeScroll();

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
