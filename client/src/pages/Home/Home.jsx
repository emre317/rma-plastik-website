import HeroSection from '../../sections/HeroSection';
import StatsSection from '../../sections/StatsSection';
import MachineParkSection from '../../sections/MachineParkSection';
import ProductExplorerSection from '../../sections/ProductExplorerSection';
import IndustriesSection from '../../sections/IndustriesSection';
import CustomMoldingSection from '../../sections/CustomMoldingSection';
import GlobalPresenceSection from '../../sections/GlobalPresenceSection';
import ContactSection from '../../sections/ContactSection';
import { useTranslation } from 'react-i18next';

import Seo from '../../seo/Seo';

export default function Home() {
  const { t } = useTranslation();

  return (
    <main>
      <Seo description={t('meta.descriptions.home')} />
      <HeroSection />
      <StatsSection />
      <MachineParkSection />
      <ProductExplorerSection />
      <IndustriesSection />
      <CustomMoldingSection />
      <GlobalPresenceSection />
      <ContactSection index={t('contact.homeIndex')} />
    </main>
  );
}