import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import {
  IconDashboard,
  IconBox,
  IconTag,
  IconStar,
  IconLayers,
  IconBriefcase,
  IconFileText,
  IconUsers,
  IconShield,
} from '../ui/Icons';
import type { ComponentType } from 'react';

interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<{ size?: number }>;
  permission?: string;
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

// Each item carries the permission needed to see it. Items the user cannot
// access are hidden entirely (the backend still enforces access regardless).
const SECTIONS: NavSection[] = [
  {
    titleKey: 'nav.dashboard',
    items: [{ to: '/', labelKey: 'nav.dashboard', icon: IconDashboard }],
  },
  {
    titleKey: 'nav.catalog',
    items: [
      { to: '/products', labelKey: 'nav.products', icon: IconBox, permission: 'product.view' },
      { to: '/categories', labelKey: 'nav.categories', icon: IconTag, permission: 'category.view' },
      { to: '/brands', labelKey: 'nav.brands', icon: IconStar, permission: 'brand.view' },
      { to: '/projects', labelKey: 'nav.projects', icon: IconLayers, permission: 'project.view' },
      { to: '/services', labelKey: 'nav.services', icon: IconBriefcase, permission: 'service.view' },
      { to: '/blogs', labelKey: 'nav.blogs', icon: IconFileText, permission: 'blog.view' },
    ],
  },
  {
    titleKey: 'nav.administration',
    items: [
      { to: '/users', labelKey: 'nav.users', icon: IconUsers, permission: 'user.view' },
      { to: '/roles', labelKey: 'nav.roles', icon: IconShield, permission: 'role.view' },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { can } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">TA</span>
        <div className="brand-text">
          <strong>{t('app.title')}</strong>
          <span>{t('app.subtitle')}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {SECTIONS.map((section) => {
          const visible = section.items.filter((i) => !i.permission || can(i.permission));
          if (visible.length === 0) return null;
          return (
            <div className="nav-section" key={section.titleKey}>
              <span className="nav-section-title">{t(section.titleKey)}</span>
              {visible.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={18} />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer muted text-sm">v1.0.0</div>
    </aside>
  );
}
