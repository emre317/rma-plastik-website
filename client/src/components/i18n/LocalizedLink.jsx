import { forwardRef } from 'react';
import { Link, NavLink } from 'react-router-dom';

import useLanguage from '../../hooks/useLanguage';
import { localizePath } from '../../i18n/languages';

/* <Link> that prefixes absolute paths with the active language. */
export const LocalizedLink = forwardRef(function LocalizedLink(
  { to, ...props },
  ref
) {
  const { code } = useLanguage();

  return <Link ref={ref} to={localizePath(to, code)} {...props} />;
});

export const LocalizedNavLink = forwardRef(function LocalizedNavLink(
  { to, ...props },
  ref
) {
  const { code } = useLanguage();

  return <NavLink ref={ref} to={localizePath(to, code)} {...props} />;
});
