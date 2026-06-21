import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBrandList, useDeleteBrand, type ListParams } from '../../hooks/useCatalog';
import { useAuth } from '../../auth/AuthContext';
import { Can } from '../../auth/Can';
import { errorMessage } from '../../lib/api';
import { localizedName } from '../../lib/localize';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { IconPlus, IconSearch, IconEdit, IconTrash, IconStar } from '../../components/ui/Icons';
import type { Brand } from '../../types/api';

export function BrandListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();

  const [page, setPage] = useState(1);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<Brand | null>(null);

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
  const { data, isLoading, isError } = useBrandList(params);
  const del = useDeleteBrand();

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success(t('brand.deleted'));
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title={t('brand.title')}
        subtitle={t('brand.subtitle')}
        actions={
          <Can permission="brand.create">
            <Link to="/brands/new" className="btn btn-primary">
              <IconPlus size={18} />
              {t('brand.new')}
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
              <IconStar size={36} />
            </span>
            <div className="empty-title">{t('brand.emptyTitle')}</div>
            <p>{t('brand.emptyBody')}</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}></th>
                    <th>{t('brand.name')}</th>
                    <th>{t('brand.website')}</th>
                    <th>{t('brand.products')}</th>
                    <th>{t('common.status')}</th>
                    <th style={{ width: 110, textAlign: 'end' }}>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div className="thumb thumb-contain">
                          {b.logo ? (
                            <img src={b.logo.thumbnailUrl ?? b.logo.url} alt="" loading="lazy" />
                          ) : (
                            <span className="thumb-placeholder">
                              <IconStar size={16} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link-name"
                          onClick={() => can('brand.update') && navigate(`/brands/${b.id}`)}
                          disabled={!can('brand.update')}
                        >
                          {localizedName(b.translations, i18n.language)}
                        </button>
                        <div className="muted text-sm">{b.slug}</div>
                      </td>
                      <td className="muted text-sm">
                        {b.website ? (
                          <a href={b.website} target="_blank" rel="noreferrer" className="link-ext">
                            {b.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="muted">{b.productCount}</td>
                      <td>
                        <span className={`badge ${b.isActive ? 'badge-green' : 'badge-gray'}`}>
                          {b.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Can permission="brand.update">
                            <Link to={`/brands/${b.id}`} className="btn btn-ghost btn-icon" title={t('common.edit')}>
                              <IconEdit size={17} />
                            </Link>
                          </Can>
                          <Can permission="brand.delete">
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon icon-danger"
                              title={t('common.delete')}
                              onClick={() => setToDelete(b)}
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
        title={t('brand.deleteTitle')}
        body={t('brand.deleteBody', { name: toDelete?.translations?.en?.name ?? toDelete?.slug })}
        loading={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
