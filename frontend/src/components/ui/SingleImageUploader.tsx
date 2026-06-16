import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconUpload, IconTrash } from './Icons';
import { Spinner } from './Spinner';

interface Props {
  imageUrl: string | null;
  canEdit: boolean;
  uploading?: boolean;
  removing?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

// Single embedded image (category image / brand logo): preview + replace + remove,
// or a dropzone when empty.
export function SingleImageUploader({
  imageUrl,
  canEdit,
  uploading,
  removing,
  onUpload,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function pick(files: FileList | null) {
    if (files && files[0]) onUpload(files[0]);
  }

  return (
    <div className="single-image">
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />

      {imageUrl ? (
        <div className="single-image-preview">
          <img src={imageUrl} alt="" />
          {canEdit && (
            <div className="single-image-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => input.current?.click()} disabled={uploading}>
                {uploading ? <Spinner size="sm" /> : <IconUpload size={15} />}
                {t('image.replace')}
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={onRemove} disabled={removing}>
                {removing ? <Spinner size="sm" /> : <IconTrash size={15} />}
                {t('image.delete')}
              </button>
            </div>
          )}
        </div>
      ) : canEdit ? (
        <div
          className={`dropzone dropzone-sm ${dragOver ? 'dragover' : ''}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pick(e.dataTransfer.files);
          }}
        >
          {uploading ? (
            <Spinner size="lg" />
          ) : (
            <>
              <span className="dropzone-icon">
                <IconUpload size={22} />
              </span>
              <span className="text-sm">{t('image.dragHint')}</span>
            </>
          )}
        </div>
      ) : (
        <div className="muted text-sm">{t('image.noImages')}</div>
      )}
    </div>
  );
}
