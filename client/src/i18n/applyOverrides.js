/*
  Applies admin-edited texts ({ "hero.title": "…", "stats.items.0.value": "…" })
  on top of a locale object. Only existing string keys are replaced, so a stale
  override can never break the structure the components expect.
*/
export default function applyOverrides(locale, overrides = {}) {
  const result = structuredClone(locale);

  Object.entries(overrides).forEach(([key, value]) => {
    if (typeof value !== 'string' || !value) {
      return;
    }

    const parts = key.split('.');
    let node = result;

    for (let i = 0; i < parts.length - 1; i += 1) {
      node = node?.[parts[i]];

      if (node === null || typeof node !== 'object') {
        return;
      }
    }

    const last = parts[parts.length - 1];

    if (typeof node[last] === 'string') {
      node[last] = value;
    }
  });

  return result;
}
