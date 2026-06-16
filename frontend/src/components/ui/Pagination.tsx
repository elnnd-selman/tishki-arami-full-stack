import { useTranslation } from 'react-i18next';
import { IconChevronLeft, IconChevronRight } from './Icons';
import type { PageMeta } from '../../types/api';

interface Props {
  meta: PageMeta;
  onChange: (page: number) => void;
}

// Direction-aware pager: chevrons flip automatically under RTL because the
// row itself is laid out with the document direction.
export function Pagination({ meta, onChange }: Props) {
  const { t } = useTranslation();
  const { page, pageSize, total, totalPages } = meta;
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <span className="muted text-sm">{t('pagination.showing', { from, to, total })}</span>
      <div className="row" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <IconChevronLeft size={16} />
          {t('pagination.prev')}
        </button>
        <span className="text-sm muted">{t('pagination.page', { page, total: totalPages })}</span>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {t('pagination.next')}
          <IconChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
