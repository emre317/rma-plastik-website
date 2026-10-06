import { Cog, Hammer, PenTool, Printer, Recycle, RefreshCw, Syringe, Truck, Waves, Wind, Wrench } from 'lucide-react';

/*
  Custom molding visuals, taken from the RMA Plastik 2025 brochure
  (pages 4, 5 and 20). Texts live in the locale files:
  customMolding.* (home section) and pages.customMolding.* (page).
*/

const IMAGE_ROOT = '/images/custom-molding';

// Same order as pages.customMolding.services
export const serviceIcons = [Cog, Wrench, PenTool, Printer, Truck];

// Same order as pages.customMolding.machines
export const machineIcons = [RefreshCw, Syringe, Wind, Waves, Recycle, Hammer];

// Same order as pages.customMolding.projects
export const projectImages = ['drone', 'cabin-bin', 'train-tank', 'floating-pier'].map(
  (name) => `${IMAGE_ROOT}/${name}.webp`
);

export const galleryImages = Array.from(
  { length: 16 },
  (_, index) => `${IMAGE_ROOT}/part-${String(index + 1).padStart(2, '0')}.webp`
);
