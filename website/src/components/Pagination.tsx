import { useTranslation } from 'react-i18next';
import { IconChevronLeft, IconChevronRight } from './Icons';
import type { PageMeta } from '../types';

export function Pagination({ meta, onChange }: { meta: PageMeta; onChange: (p: number) => void }) {
  const { t } = useTranslation();
  if (meta.totalPages <= 1) return null;
  const pages = Array.from({ length: meta.totalPages }, (_, i) => i + 1);

  return (
    <div className="pagination">
      <button type="button" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
        <IconChevronLeft size={16} />
        {t('common.previous')}
      </button>
      {pages.map((p) => (
        <button key={p} type="button" className={p === meta.page ? 'active' : ''} onClick={() => onChange(p)}>
          {p}
        </button>
      ))}
      <button type="button" disabled={meta.page >= meta.totalPages} onClick={() => onChange(meta.page + 1)}>
        {t('common.next')}
        <IconChevronRight size={16} />
      </button>
    </div>
  );
}
