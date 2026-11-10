import { Outlet } from 'react-router-dom';

import AdminSidebar from '../components/admin/AdminSidebar';
import QuoteAlerts from '../components/admin/QuoteAlerts';
import MeetingBar from '../components/admin/MeetingBar';
import TranslationNotice from '../components/admin/TranslationNotice';
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

        {/* Page column: the meeting strip sits above every page */}
        <div className="adMain">
          <MeetingBar />
          <Outlet />
        </div>

        <QuoteAlerts />
        <TranslationNotice />
      </main>
    </AdminSessionProvider>
  );
}
