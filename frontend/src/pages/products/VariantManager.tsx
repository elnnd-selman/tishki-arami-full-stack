import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteVariant } from '../../hooks/useProducts';
import { useAuth } from '../../auth/AuthContext';
import { Can } from '../../auth/Can';
import { errorMessage } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { VariantEditor } from './VariantEditor';
import { IconPlus, IconEdit, IconTrash, IconLayers } from '../../components/ui/Icons';
import type { Product, ProductVariant } from '../../types/api';

export function VariantManager({ product }: { product: Product }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can('product.update');

  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<ProductVariant | null>(null);
  const del = useDeleteVariant(product.id);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success(t('variant.deleted'));
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          {t('variant.title')} <span className="muted">({product.variants.length})</span>
        </span>
        <Can permission="product.update">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <IconPlus size={16} />
            {t('variant.new')}
          </button>
        </Can>
      </div>

      <div className="card-body">
        {product.variants.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px' }}>
            <span className="empty-icon" style={{ width: 56, height: 56 }}>
              <IconLayers size={26} />
            </span>
            <div className="empty-title">{t('variant.emptyTitle')}</div>
            <p className="text-sm">{t('variant.emptyBody')}</p>
          </div>
        ) : (
          <div className="variant-list">
            {product.variants.map((v) => (
              <div key={v.id} className="variant-card">
                <div className="variant-attrs">
                  {v.attributes.length === 0 ? (
                    <span className="muted text-sm">{t('variant.noAttributes')}</span>
                  ) : (
                    v.attributes.map((a) => (
                      <span className="attr-chip" key={a.id}>
                        <span className="attr-chip-key">{a.key}</span>
                        <span className="attr-chip-value">{a.value}</span>
                      </span>
                    ))
                  )}
                </div>
                <div className="variant-meta">
                  {v.sku && <span className="muted text-sm">{v.sku}</span>}
                  {v.price != null && (
                    <span className="variant-price">
                      {v.price.toFixed(2)} {v.currency}
                    </span>
                  )}
                  <span className={`badge ${v.isActive ? 'badge-green' : 'badge-gray'}`}>
                    {v.isActive ? t('common.active') : t('common.inactive')}
                  </span>
                </div>
                {canEdit && (
                  <div className="row-actions">
                    <button type="button" className="btn btn-ghost btn-icon" onClick={() => setEditing(v)} title={t('common.edit')}>
                      <IconEdit size={16} />
                    </button>
                    <Can permission="product.update">
                      <button type="button" className="btn btn-ghost btn-icon icon-danger" onClick={() => setToDelete(v)} title={t('common.delete')}>
                        <IconTrash size={16} />
                      </button>
                    </Can>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <VariantEditor
          productId={product.id}
          variant={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('variant.deleteTitle')}
        body={t('variant.deleteBody')}
        loading={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
