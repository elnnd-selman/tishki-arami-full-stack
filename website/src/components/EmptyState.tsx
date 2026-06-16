import { useTranslation } from 'react-i18next';
import { IconSearch } from './Icons';

export function EmptyState({ title, desc }: { title?: string; desc?: string }) {
  const { t } = useTranslation();
  return (
    <div className="empty-state">
      <span className="tile-icon" style={{ margin: '0 auto 16px' }}>
        <IconSearch size={24} />
      </span>
      <h3>{title ?? t('common.noResults')}</h3>
      <p>{desc ?? t('common.noResultsDesc')}</p>
    </div>
  );
}
