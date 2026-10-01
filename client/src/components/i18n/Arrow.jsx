import useLanguage from '../../hooks/useLanguage';

const glyphs = {
  ltr: {
    'up-right': '↗',
    right: '→',
    left: '←',
    down: '↓',
    up: '↑',
  },
  rtl: {
    'up-right': '↖',
    right: '←',
    left: '→',
    down: '↓',
    up: '↑',
  },
};

/* Decorative arrow that points the right way in RTL languages. */
export default function Arrow({ direction = 'up-right', className }) {
  const { dir } = useLanguage();

  return (
    <span className={className} aria-hidden="true">
      {glyphs[dir][direction]}
    </span>
  );
}
