import ExportMap from './ExportMap';
import exportMap from '../../data/exportMap';
import world from '../../data/worldMapCountries.json';

/*
  Lazy-loaded map: joins the chosen markets with their shapes on the dotted
  world map, so the country geometry never lands in the main bundle.
*/
export default function ExportMapWorld({ markets, ...props }) {
  const data = {
    ...exportMap,
    destinations: markets
      .filter((market) => world[market.code])
      .map((market) => ({ key: market.key, labelPosition: market.labelPosition || 'top', ...world[market.code] })),
  };

  return <ExportMap data={data} {...props} />;
}
