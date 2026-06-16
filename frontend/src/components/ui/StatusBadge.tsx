import { useTranslation } from 'react-i18next';
import type { PublishStatus } from '../../types/api';

const MAP: Record<PublishStatus, string> = {
  PUBLISHED: 'badge-green',
  DRAFT: 'badge-amber',
  ARCHIVED: 'badge-gray',
};

export function StatusBadge({ status }: { status: PublishStatus }) {
  const { t } = useTranslation();
  return <span className={`badge ${MAP[status]}`}>{t(`status.${status}`)}</span>;
}
