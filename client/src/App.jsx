import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './components/ScrollToTop';
import AnalyticsTracker from './analytics/AnalyticsTracker';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AppRoutes />
      <AnalyticsTracker />
    </>
  );
}
