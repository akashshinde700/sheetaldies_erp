/**
 * ConfirmDialog — accessible, on-brand replacement for window.confirm().
 *
 * Renders a centered modal with a title, message, and confirm/cancel actions.
 * Closes on backdrop click or Escape. Focus is moved to the confirm button on
 * open. Use the `variant` prop to tint the icon/confirm button for destructive
 * ("danger") vs neutral ("primary") actions.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null);
 *   ...
 *   {confirm && (
 *     <ConfirmDialog
 *       {...confirm}
 *       onCancel={() => setConfirm(null)}
 *     />
 *   )}
 *   // to open:
 *   setConfirm({ title, message, confirmLabel, variant, onConfirm: async () => {...} });
 */
import { useEffect, useRef, useState } from 'react';

export default function ConfirmDialog({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'primary'
  icon,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  const handleConfirm = async () => {
    if (busy) return;
    try {
      setBusy(true);
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  };

  const isDanger = variant === 'danger';
  const iconName = icon || (isDanger ? 'warning' : 'help');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-backdrop-in p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel?.(); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="bg-white rounded-2xl shadow-card-elevated w-full max-w-md overflow-hidden animate-scale-in"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-700'
              }`}
            >
              <span className="material-symbols-outlined">{iconName}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="confirm-title" className="text-base font-bold text-slate-900 font-headline">
                {title}
              </h3>
              {message && (
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={isDanger ? 'btn-danger' : 'btn-primary'}
          >
            {busy && (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
