import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCategoryList, useDeleteCategory, type ListParams } from '../../hooks/useCatalog';
import { useAuth } from '../../auth/AuthContext';
import { Can } from '../../auth/Can';
import { errorMessage } from '../../lib/api';
import { localizedName } from '../../lib/localize';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { IconPlus, IconSearch, IconEdit, IconTrash, IconTag } from '../../components/ui/Icons';
import type { Category } from '../../types/api';

export function CategoryListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();

  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<Category | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(input);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [input]);

  const params: ListParams = useMemo(
    () => ({ page, pageSize: 10, search, sortBy: 'sortOrder', sortDir: 'asc' }),
    [page, search],
  );
  const { data, isLoading, isError } = useCategoryList(params);
  const del = useDeleteCategory();

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success(t('category.deleted'));
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title={t('category.title')}
        subtitle={t('category.subtitle')}
        actions={
          <Can permission="category.create">
            <Link to="/categories/new" className="btn btn-primary">
              <IconPlus size={18} />
              {t('category.new')}
            </Link>
          </Can>
        }
      />

      <div className="card">
        <div className="toolbar">
          <div className="search-box">
            <IconSearch size={18} className="search-icon" />
            <input
              className="input search-input"
              placeholder={t('common.searchPlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="center-screen" style={{ minHeight: 220 }}>
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="empty">
            <div className="empty-title">{t('errors.loadFailed')}</div>
          </div>
        ) : data && data.data.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">
              <IconTag size={36} />
            </span>
            <div className="empty-title">{t('category.emptyTitle')}</div>
            <p>{t('category.emptyBody')}</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}></th>
                    <th>{t('category.name')}</th>
                    <th>{t('category.type')}</th>
                    <th>{t('category.parent')}</th>
                    <th>{t('category.products')}</th>
                    <th>{t('common.status')}</th>
                    <th style={{ width: 110, textAlign: 'end' }}>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="thumb">
                          {c.image ? (
                            <img src={c.image.thumbnailUrl ?? c.image.url} alt="" loading="lazy" />
                          ) : (
                            <span className="thumb-placeholder">
                              <IconTag size={16} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link-name"
                          onClick={() => can('category.update') && navigate(`/categories/${c.id}`)}
                          disabled={!can('category.update')}
                        >
                          {localizedName(c.translations, i18n.language)}
                        </button>
                        <div className="muted text-sm">{c.slug}</div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{c.type}</span>
                      </td>
                      <td>{c.parent ? localizedName(c.parent.translations, i18n.language) : '-'}</td>
                      <td className="muted">{c.productCount}</td>
                      <td>
                        <span className={`badge ${c.isActive ? 'badge-green' : 'badge-gray'}`}>
                          {c.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Can permission="category.update">
                            <Link to={`/categories/${c.id}`} className="btn btn-ghost btn-icon" title={t('common.edit')}>
                              <IconEdit size={17} />
                            </Link>
                          </Can>
                          <Can permission="category.delete">
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon icon-danger"
                              title={t('common.delete')}
                              onClick={() => setToDelete(c)}
                            >
                              <IconTrash size={17} />
                            </button>
                          </Can>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && (
              <div className="card-body" style={{ borderTop: '1px solid var(--border)' }}>
                <Pagination meta={data.meta} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('category.deleteTitle')}
        body={t('category.deleteBody', { name: toDelete?.translations?.en?.name ?? toDelete?.slug })}
        loading={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
