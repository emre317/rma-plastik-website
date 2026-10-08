/*
  Company name above the home page headline: a light line draws in, then
  "RMA" (solid, with a slow light sweep) and "Plastik" (light weight) rise in.
  The name is the same in every language, so it is kept left-to-right.
*/
export default function HeroBrand({ className = '' }) {
  return (
    <p className={`heroBrand ${className}`}>
      <span className="heroBrandLine" aria-hidden="true" />
      <span className="heroBrandName" dir="ltr" lang="tr">
        <strong>RMA</strong>
        <span className="heroBrandDivider" aria-hidden="true" />
        <span>Plastik</span>
      </span>
    </p>
  );
}
