import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSaveVariant, useVariantImage } from '../../hooks/useProducts';
import { errorMessage } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import { Spinner } from '../../components/ui/Spinner';
import { IconPlus, IconClose, IconTrash } from '../../components/ui/Icons';
import { SingleImageUploader } from '../../components/ui/SingleImageUploader';
import { useAuth } from '../../auth/AuthContext';
import type { ProductVariant } from '../../types/api';

// `uid` is a stable React key so removing a middle row keeps each input bound to
// its own value (index keys would shift values between fields).
interface AttrRow {
  uid: number;
  key: string;
  value: string;
}

interface Props {
  productId: string;
  variant: ProductVariant | null; // null = create
  onClose: () => void;
}

export function VariantEditor({ productId, variant, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const { can } = useAuth();
  const save = useSaveVariant(productId);
  const variantImg = useVariantImage(productId, variant?.id ?? '');

  const uidRef = useRef(0);
  const newRow = (key = '', value = ''): AttrRow => ({ uid: ++uidRef.current, key, value });

  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isActive, setIsActive] = useState(true);
  const [attrs, setAttrs] = useState<AttrRow[]>(() => [newRow()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (variant) {
      setSku(variant.sku ?? '');
      setPrice(variant.price != null ? String(variant.price) : '');
      setCurrency(variant.currency);
      setIsActive(variant.isActive);
      setAttrs(
        variant.attributes.length
          ? variant.attributes.map((a) => newRow(a.key, a.value))
          : [newRow()],
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function setAttr(uid: number, field: 'key' | 'value', value: string) {
    setAttrs((rows) => rows.map((r) => (r.uid === uid ? { ...r, [field]: value } : r)));
  }
  function addAttr() {
    setAttrs((rows) => [...rows, newRow()]);
  }
  function removeAttr(uid: number) {
    setAttrs((rows) => {
      const next = rows.filter((r) => r.uid !== uid);
      return next.length ? next : [newRow()];
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Keep only fully-filled attribute rows.
    const cleaned = attrs
      .map((a) => ({ key: a.key.trim(), value: a.value.trim() }))
      .filter((a) => a.key || a.value);

    if (cleaned.some((a) => !a.key || !a.value)) {
      setError(t('variant.attrIncomplete'));
      return;
    }
    const keys = cleaned.map((a) => a.key.toLowerCase());
    if (new Set(keys).size !== keys.length) {
      setError(t('variant.attrDuplicate'));
      return;
    }

    try {
      await save.mutateAsync({
        variantId: variant?.id,
        body: {
          sku: sku.trim() || null,
          price: price === '' ? null : Number(price),
          currency: currency || 'USD',
          isActive,
          attributes: cleaned,
        },
      });
      toast.success(variant ? t('variant.updated') : t('variant.created'));
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Portal to body: a modal <form> must not be nested inside the product <form>.
  return createPortal(
    <div className="modal-overlay" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="card-header">
          <span className="card-title">{variant ? t('variant.editTitle') : t('variant.newTitle')}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label={t('common.close')}>
            <IconClose size={18} />
          </button>
        </div>

        <div className="card-body stack">
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="grid-3">
            <div className="field">
              <label className="label">{t('product.sku')}</label>
              <input className="input" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t('product.price')}</label>
              <input className="input" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t('product.currency')}</label>
              <input className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </div>
          </div>

          <div className="field">
            <label className="label">{t('variant.attributes')}</label>
            <span className="hint">{t('variant.attributesHint')}</span>
            <div className="attr-list">
              {attrs.map((row) => (
                <div className="attr-row" key={row.uid}>
                  <input
                    className="input"
                    placeholder={t('variant.attrKey')}
                    value={row.key}
                    onChange={(e) => setAttr(row.uid, 'key', e.target.value)}
                  />
                  <span className="attr-sep">:</span>
                  <input
                    className="input"
                    placeholder={t('variant.attrValue')}
                    value={row.value}
                    onChange={(e) => setAttr(row.uid, 'value', e.target.value)}
                  />
                  <button type="button" className="btn btn-ghost btn-icon icon-danger" onClick={() => removeAttr(row.uid)} aria-label={t('common.remove')}>
                    <IconTrash size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-outline btn-sm attr-add" onClick={addAttr}>
              <IconPlus size={15} />
              {t('variant.addAttribute')}
            </button>
          </div>

          <label className="switch-field" style={{ paddingBottom: 0 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>{t('common.active')}</span>
          </label>

          {variant && (
            <div className="field">
              <label className="label">{t('variant.image')}</label>
              <SingleImageUploader
                imageUrl={variant.image?.url ?? null}
                canEdit={can('product.upload')}
                uploading={variantImg.upload.isPending}
                removing={variantImg.remove.isPending}
                onUpload={(file) =>
                  variantImg.upload.mutateAsync(file)
                    .then(() => toast.success(t('image.uploaded')))
                    .catch((e) => toast.error(errorMessage(e)))
                }
                onRemove={() =>
                  variantImg.remove.mutateAsync()
                    .then(() => toast.success(t('image.removed')))
                    .catch((e) => toast.error(errorMessage(e)))
                }
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>
            {save.isPending && <Spinner size="sm" />}
            {variant ? t('common.saveChanges') : t('common.create')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
