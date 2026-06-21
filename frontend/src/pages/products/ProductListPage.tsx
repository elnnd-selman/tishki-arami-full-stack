import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useProducts,
  useCategories,
  useBrands,
  useDeleteProduct,
  type ProductListParams,
} from '../../hooks/useProducts';
import { useAuth } from '../../auth/AuthContext';
import { Can } from '../../auth/Can';
import { errorMessage } from '../../lib/api';
import { localizedName } from '../../lib/localize';
import { PageHeader } from '../../components/ui/PageHeader';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconImage,
  IconStarFilled,
} from '../../components/ui/Icons';
import type { Product, PublishStatus } from '../../types/api';

export function ProductListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [status, setStatus] = useState<PublishStatus | ''>('');
  const [toDelete, setToDelete] = useState<Product | null>(null);

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const params: ProductListParams = useMemo(
    () => ({ page, pageSize: 10, search, categoryId, brandId, status, sortBy: 'createdAt', sortDir: 'desc' }),
    [page, search, categoryId, brandId, status],
  );

  const { data, isLoading, isError } = useProducts(params);
  const categories = useCategories();
  const brands = useBrands();
  const del = useDeleteProduct();

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success(t('product.deleted'));
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title={t('product.title')}
        subtitle={t('product.subtitle')}
        actions={
          <Can permission="product.create">
            <Link to="/products/new" className="btn btn-primary">
              <IconPlus size={18} />
              {t('product.new')}
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <select
            className="select filter-select"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('product.category')}: {t('common.all')}</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {localizedName(c.translations, i18n.language)}
              </option>
            ))}
          </select>

          <select
            className="select filter-select"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('product.brand')}: {t('common.all')}</option>
            {brands.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {localizedName(b.translations, i18n.language)}
              </option>
            ))}
          </select>

          <select
            className="select filter-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as PublishStatus | '');
              setPage(1);
            }}
          >
            <option value="">{t('common.status')}: {t('common.all')}</option>
            <option value="PUBLISHED">{t('status.PUBLISHED')}</option>
            <option value="DRAFT">{t('status.DRAFT')}</option>
            <option value="ARCHIVED">{t('status.ARCHIVED')}</option>
          </select>
        </div>

        {isLoading ? (
          <div className="center-screen" style={{ minHeight: 240 }}>
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <div className="empty">
            <div className="empty-title">{t('errors.loadFailed')}</div>
          </div>
        ) : data && data.data.length === 0 ? (
          <div className="empty">
            <span className="empty-icon">
              <IconImage size={40} />
            </span>
            <div className="empty-title">{t('product.emptyTitle')}</div>
            <p>{t('product.emptyBody')}</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}></th>
                    <th>{t('product.name')}</th>
                    <th>{t('product.sku')}</th>
                    <th>{t('product.category')}</th>
                    <th>{t('product.brand')}</th>
                    <th>{t('common.status')}</th>
                    <th style={{ width: 110, textAlign: 'end' }}>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((p) => {
                    const editable = can('product.update');
                    return (
                      <tr key={p.id}>
                        <td>
                          <div className="thumb">
                            {p.coverImage ? (
                              <img src={p.coverImage.thumbnailUrl} alt="" loading="lazy" />
                            ) : (
                              <span className="thumb-placeholder">
                                <IconImage size={18} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="link-name"
                            onClick={() => editable && navigate(`/products/${p.id}`)}
                            disabled={!editable}
                          >
                            {localizedName(p.translations, i18n.language)}
                          </button>
                          {p.isFeatured && (
                            <span className="featured-star" title={t('product.featured')}>
                              <IconStarFilled size={14} />
                            </span>
                          )}
                          <div className="muted text-sm">{p.slug}</div>
                        </td>
                        <td className="muted">{p.sku ?? '-'}</td>
                        <td>{p.category ? localizedName(p.category.translations, i18n.language) : '-'}</td>
                        <td>{p.brand ? localizedName(p.brand.translations, i18n.language) : '-'}</td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td>
                          <div className="row-actions">
                            <Can permission="product.update">
                              <Link
                                to={`/products/${p.id}`}
                                className="btn btn-ghost btn-icon"
                                title={t('common.edit')}
                              >
                                <IconEdit size={17} />
                              </Link>
                            </Can>
                            <Can permission="product.delete">
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon icon-danger"
                                title={t('common.delete')}
                                onClick={() => setToDelete(p)}
                              >
                                <IconTrash size={17} />
                              </button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
        title={t('product.deleteTitle')}
        body={t('product.deleteBody', { name: toDelete?.translations?.en?.name ?? toDelete?.slug })}
        loading={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
