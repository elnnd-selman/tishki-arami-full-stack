import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useUploadImages,
  useDeleteImage,
  useReplaceImage,
  useSetCover,
} from '../../hooks/useProducts';
import { useToast } from '../../components/ui/Toast';
import { Can } from '../../auth/Can';
import { useAuth } from '../../auth/AuthContext';
import { errorMessage } from '../../lib/api';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { IconUpload, IconTrash, IconStar, IconStarFilled, IconEdit } from '../../components/ui/Icons';
import type { Product, ProductImage } from '../../types/api';

export function ImageManager({ product }: { product: Product }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { can } = useAuth();
  const canUpload = can('product.upload');

  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ProductImage | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = useUploadImages(product.id);
  const remove = useDeleteImage(product.id);
  const replace = useReplaceImage(product.id);
  const setCover = useSetCover(product.id);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    try {
      await upload.mutateAsync(Array.from(files));
      toast.success(t('image.uploaded'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function handleReplaceFile(files: FileList | null) {
    if (!files || files.length === 0 || !replacingId) return;
    try {
      await replace.mutateAsync({ imageId: replacingId, file: files[0] });
      toast.success(t('image.replaced'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setReplacingId(null);
    }
  }

  async function handleSetCover(id: string) {
    try {
      await setCover.mutateAsync(id);
      toast.success(t('image.coverSet'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success(t('image.removed'));
      setToDelete(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{t('image.manager')}</span>
        <span className="muted text-sm">{product.images.length}</span>
      </div>
      <div className="card-body stack">
        <Can permission="product.upload">
          <div
            className={`dropzone ${dragOver ? 'dragover' : ''}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void handleFiles(e.dataTransfer.files);
            }}
          >
            {upload.isPending ? (
              <Spinner size="lg" />
            ) : (
              <>
                <span className="dropzone-icon">
                  <IconUpload size={26} />
                </span>
                <strong>{t('image.dragHint')}</strong>
                <span className="muted text-sm">{t('image.formats')}</span>
              </>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
        </Can>

        <input
          ref={replaceInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void handleReplaceFile(e.target.files);
            e.target.value = '';
          }}
        />

        {product.images.length === 0 ? (
          <div className="muted text-sm" style={{ textAlign: 'center', padding: 12 }}>
            {t('image.noImages')}
          </div>
        ) : (
          <div className="image-grid">
            {product.images.map((img) => (
              <div key={img.id} className={`image-tile ${img.isCover ? 'is-cover' : ''}`}>
                <img src={img.thumbnailUrl} alt={img.altText ?? ''} loading="lazy" />
                {img.isCover && (
                  <span className="cover-flag">
                    <IconStarFilled size={12} /> {t('product.cover')}
                  </span>
                )}
                {canUpload && (
                  <div className="image-tile-actions">
                    {!img.isCover && (
                      <button
                        type="button"
                        className="tile-btn"
                        title={t('image.setCover')}
                        onClick={() => void handleSetCover(img.id)}
                      >
                        <IconStar size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="tile-btn"
                      title={t('image.replace')}
                      onClick={() => {
                        setReplacingId(img.id);
                        replaceInput.current?.click();
                      }}
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      type="button"
                      className="tile-btn tile-btn-danger"
                      title={t('image.delete')}
                      onClick={() => setToDelete(img)}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('image.delete')}
        body={t('product.deleteBody')}
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
