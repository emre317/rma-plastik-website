import {
  Building2, Droplets, Factory, Filter, FlaskConical, Fuel, Layers, Leaf, Package,
  Ship, Shirt, Tractor, TrafficCone, Trees, Truck, UtensilsCrossed, Warehouse, Wrench,
} from 'lucide-react';

/* Sector icons the admin panel can pick (server/models/Sector.js SECTOR_ICONS) */
const SECTOR_ICONS = {
  droplets: Droplets,
  filter: Filter,
  shirt: Shirt,
  utensils: UtensilsCrossed,
  flask: FlaskConical,
  traffic: TrafficCone,
  trees: Trees,
  layers: Layers,
  factory: Factory,
  tractor: Tractor,
  ship: Ship,
  truck: Truck,
  building: Building2,
  fuel: Fuel,
  leaf: Leaf,
  warehouse: Warehouse,
  wrench: Wrench,
  package: Package,
};

export const sectorIcon = (key) => SECTOR_ICONS[key] || Layers;

export default SECTOR_ICONS;
