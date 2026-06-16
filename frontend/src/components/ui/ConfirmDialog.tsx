import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { IconAlert } from './Icons';
import { Spinner } from './Spinner';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  loading,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  // Portal to body so the dialog is never nested inside a parent <form>.
  return createPortal(
    <div className="modal-overlay" onMouseDown={onCancel}>
      <div className="modal modal-sm" onMouseDown={(e) => e.stopPropagation()}>
        <div className="confirm-body">
          <span className={`confirm-icon ${danger ? 'confirm-icon-danger' : ''}`}>
            <IconAlert size={22} />
          </span>
          <div>
            <h3 className="card-title" style={{ marginBottom: 6 }}>
              {title}
            </h3>
            <p className="muted text-sm">{body}</p>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
            {cancelLabel ?? t('common.cancelAction')}
          </button>
          <button
            type="button"
            className={danger ? 'btn btn-accent' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner size="sm" />}
            {confirmLabel ?? t('common.deleteAction')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
