import HeroSection from '../../sections/HeroSection';
import StatsSection from '../../sections/StatsSection';
import TechnologySection from '../../sections/TechnologySection';
import ProductExplorerSection from '../../sections/ProductExplorerSection';
import IndustriesSection from '../../sections/IndustriesSection';
import EngineeringSection from '../../sections/EngineeringSection';
import FacilitiesSection from '../../sections/FacilitiesSection';
import QualitySection from '../../sections/QualitySection';
import GlobalPresenceSection from '../../sections/GlobalPresenceSection';
import FinalCTASection from '../../sections/FinalCTASection';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <StatsSection />
      <TechnologySection />
      <ProductExplorerSection />
      <IndustriesSection />
      <EngineeringSection />
      <FacilitiesSection />
      <QualitySection />
      <GlobalPresenceSection />
      <FinalCTASection />
    </main>
  );
}