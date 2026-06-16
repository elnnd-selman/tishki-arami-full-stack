import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../auth/AuthContext';
import { Can } from '../auth/Can';
import { PageHeader } from '../components/ui/PageHeader';
import { IconBox, IconCheck, IconFileText, IconChevronRight } from '../components/ui/Icons';

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: string;
}) {
  return (
    <div className="card stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label muted">{label}</div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const all = useProducts({ pageSize: 1 });
  const published = useProducts({ pageSize: 1, status: 'PUBLISHED' });
  const drafts = useProducts({ pageSize: 1, status: 'DRAFT' });

  const total = all.data?.meta.total ?? 0;
  const pub = published.data?.meta.total ?? 0;
  const draft = drafts.data?.meta.total ?? 0;

  return (
    <div className="stack">
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.welcome', { name: user?.fullName })} />

      <Can permission="product.view">
        <div className="grid-3">
          <StatCard
            icon={<IconBox size={22} />}
            label={t('dashboard.totalProducts')}
            value={total}
            tone="tone-blue"
          />
          <StatCard
            icon={<IconCheck size={22} />}
            label={t('dashboard.published')}
            value={pub}
            tone="tone-green"
          />
          <StatCard
            icon={<IconFileText size={22} />}
            label={t('dashboard.drafts')}
            value={draft}
            tone="tone-amber"
          />
        </div>
      </Can>

      <Can permission="product.view">
        <div className="card">
          <div className="card-header">
            <span className="card-title">{t('dashboard.quickActions')}</span>
          </div>
          <div className="card-body">
            <Link to="/products" className="quick-action">
              <span className="quick-action-icon tone-blue">
                <IconBox size={20} />
              </span>
              <div className="spacer">
                <strong>{t('dashboard.manageProducts')}</strong>
                <div className="muted text-sm">{t('product.subtitle')}</div>
              </div>
              <IconChevronRight size={18} className="quick-action-arrow" />
            </Link>
          </div>
        </div>
      </Can>
    </div>
  );
}
