import { Fragment } from 'react';

/*
  Home page headline with the word-by-word intro: each word fades in from a
  blur, one after the other (--w is the word's position in the whole title),
  and a light sweeps over the accent line. The spaces stay real text, so the
  title reads normally for screen readers and search engines.
*/
const split = (text) => String(text || '').split(' ').filter(Boolean);

function words(text, offset) {
  return split(text).map((word, index, all) => (
    <Fragment key={`${word}-${index}`}>
      <span className="heroWord" style={{ '--w': offset + index }}>{word}</span>
      {index < all.length - 1 ? ' ' : null}
    </Fragment>
  ));
}

export default function HeroTitle({ line1, accent, line2 }) {
  const first = split(line1).length;
  const middle = split(accent).length;

  return (
    <h1 className="heroWords">
      <span className="heroLine">{words(line1, 0)}</span>
      <span className="heroLine heroLineAccent">{words(accent, first)}</span>
      <span className="heroLine">{words(line2, first + middle)}</span>
    </h1>
  );
}
