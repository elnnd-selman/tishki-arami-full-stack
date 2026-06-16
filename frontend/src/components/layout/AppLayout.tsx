import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { useAuth } from '../../auth/AuthContext';
import { IconLogout, IconClose, IconMenu } from '../ui/Icons';

export function AppLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.fullName
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-shell">
      <div className={`sidebar-wrap ${mobileOpen ? 'open' : ''}`}>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="btn btn-ghost btn-icon mobile-only"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={t('common.menu')}
          >
            {mobileOpen ? <IconClose /> : <IconMenu />}
          </button>

          <div className="spacer" />

          <LanguageSwitcher />

          <div className="topbar-user">
            <div className="avatar">{initials}</div>
            <div className="topbar-user-info">
              <strong>{user?.fullName}</strong>
              <span className="muted text-sm">{user?.role.name}</span>
            </div>
          </div>

          <button type="button" className="btn btn-ghost btn-icon" onClick={() => void logout()} title={t('auth.signOut')}>
            <IconLogout />
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
