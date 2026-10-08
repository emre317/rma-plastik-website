/*
  A figure with its unit set apart: "7,5 m" → 7,5 + m, "40.000 L" → 40.000 + L,
  "500+" → 500 + "+". Text without a leading number ("Mersin") stays as it is.
  The value reads left to right also on the Arabic site.
*/
const PATTERN = /^([+−-]?[\d][\d.,\s]*)(.*)$/;

export default function StatValue({ value }) {
  const text = String(value ?? '').trim();
  const match = text.match(PATTERN);

  if (!match || !match[2].trim()) {
    return <bdi className="statValue">{text}</bdi>;
  }

  return (
    <bdi className="statValue" dir="ltr">
      <span className="statNumber">{match[1].trim()}</span>
      <span className="statUnit">{match[2].trim()}</span>
    </bdi>
  );
}
