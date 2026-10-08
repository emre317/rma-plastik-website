/*
  Decorative background layer for a section: two slowly drifting light orbs
  and a fading dot grid (`ring` = which corner the grid sits in: start / end).
  "dark" for navy sections, "light" for white ones. Purely visual; it sits behind the content.
*/
export default function SectionDeco({ tone = 'dark', ring = 'end' }) {
  return (
    <div className={`sectionDeco ${tone} ring-${ring}`} aria-hidden="true">
      <span className="sdOrb a" />
      <span className="sdOrb b" />
      <span className="sdGrid" />
    </div>
  );
}
