import { useId } from 'react';

/*
  Inline SVG flags (emoji flags do not render on Windows).
  All flags are drawn on a 3:2 canvas and cropped to the badge with
  preserveAspectRatio so they line up at any size.
*/

function TurkeyFlag() {
  return (
    <svg
      viewBox="0 -30000 90000 60000"
      preserveAspectRatio="xMidYMid slice"
    >
      <path fill="#e30a17" d="M0-30000h90000v60000H0z" />
      <path
        fill="#fff"
        d="m41750 0 13568-4408-8386 11541V-7133l8386 11541zm925 8021a15000 15000 0 1 1 0-16042 12000 12000 0 1 0 0 16042z"
      />
    </svg>
  );
}

function UnitedKingdomFlag() {
  const id = useId().replace(/:/g, '');

  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice">
      <clipPath id={`${id}-s`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}-t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}-s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath={`url(#${id}-t)`}
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

function UnitedArabEmiratesFlag() {
  return (
    <svg viewBox="0 0 12 6" preserveAspectRatio="xMidYMid slice">
      <path fill="#00732f" d="M0 0h12v2H0z" />
      <path fill="#fff" d="M0 2h12v2H0z" />
      <path fill="#000" d="M0 4h12v2H0z" />
      <path fill="#ff0000" d="M0 0h3v6H0z" />
    </svg>
  );
}

const flags = {
  tr: TurkeyFlag,
  gb: UnitedKingdomFlag,
  ae: UnitedArabEmiratesFlag,
};

export default function Flag({ code, className = '' }) {
  const FlagSvg = flags[code];

  if (!FlagSvg) {
    return null;
  }

  return (
    <span className={`flag ${className}`} aria-hidden="true">
      <FlagSvg />
    </span>
  );
}
