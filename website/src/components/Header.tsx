import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { IconMenu, IconClose } from './Icons';

const NAV = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/products', key: 'nav.products' },
  { to: '/categories', key: 'nav.categories' },
  { to: '/brands', key: 'nav.brands' },
  { to: '/services', key: 'nav.services' },
  { to: '/projects', key: 'nav.projects' },
  { to: '/blog', key: 'nav.blog' },
  { to: '/about', key: 'nav.about' },
];

export function Header() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="TishkiArami home">
          <img src="/logo.png" alt="TishkiArami logo" className="brand-logo-img" width={40} height={40} style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />
          <span className="brand-name">
            {t('brand.name')}
            <span>{t('brand.accent')}</span>
          </span>
        </Link>

        <nav className="main-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t(n.key)}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <LanguageSwitcher />
          <Link to="/contact" className="btn btn-primary btn-sm">
            {t('nav.contact')}
          </Link>
          <button type="button" className="icon-btn menu-toggle" aria-label={t('nav.home')} onClick={() => setOpen(true)}>
            <IconMenu />
          </button>
        </div>
      </div>

      {open &&
        createPortal(
          <>
            <div className="drawer-backdrop" onClick={() => setOpen(false)} />
            <aside className="drawer">
              <div className="drawer-head">
                <span className="brand" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src="/logo.png" alt="" className="brand-logo-img" style={{ width: 32, height: 32 }} />
                  <span className="brand-name">
                    {t('brand.name')}
                    <span>{t('brand.accent')}</span>
                  </span>
                </span>
                <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
                  <IconClose />
                </button>
              </div>
              {NAV.concat([{ to: '/contact', key: 'nav.contact' }]).map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  {t(n.key)}
                </NavLink>
              ))}
              <div style={{ marginTop: 16 }}>
                <LanguageSwitcher />
              </div>
            </aside>
          </>,
          document.body,
        )}
    </header>
  );
}
