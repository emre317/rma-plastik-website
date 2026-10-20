import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './components/ScrollToTop';
import AnalyticsTracker from './analytics/AnalyticsTracker';
import { ConfirmProvider } from './components/ui/ConfirmDialog';

export default function App() {
  return (
    <ConfirmProvider>
      <ScrollToTop />
      <AppRoutes />
      <AnalyticsTracker />
    </ConfirmProvider>
  );
}
