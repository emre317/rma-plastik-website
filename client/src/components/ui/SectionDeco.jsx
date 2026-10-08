/*
  Decorative background layer for a section: two slowly drifting light orbs,
  a fading dot grid and a thin blueprint ring. "dark" for navy sections,
  "light" for white ones. Purely visual; it sits behind the content.
*/
export default function SectionDeco({ tone = 'dark', ring = 'end' }) {
  return (
    <div className={`sectionDeco ${tone} ring-${ring}`} aria-hidden="true">
      <span className="sdOrb a" />
      <span className="sdOrb b" />
      <span className="sdGrid" />
      <span className="sdRing" />
    </div>
  );
}
