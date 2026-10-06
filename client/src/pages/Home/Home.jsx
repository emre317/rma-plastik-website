import HeroSection from '../../sections/HeroSection';
import StatsSection from '../../sections/StatsSection';
import TechnologySection from '../../sections/TechnologySection';
import ProductExplorerSection from '../../sections/ProductExplorerSection';
import IndustriesSection from '../../sections/IndustriesSection';
import EngineeringSection from '../../sections/EngineeringSection';
import FacilitiesSection from '../../sections/FacilitiesSection';
import QualitySection from '../../sections/QualitySection';
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
      <TechnologySection />
      <ProductExplorerSection />
      <IndustriesSection />
      <EngineeringSection />
      <FacilitiesSection />
      <QualitySection />
      <GlobalPresenceSection />
      <ContactSection index={t('contact.homeIndex')} />
    </main>
  );
}