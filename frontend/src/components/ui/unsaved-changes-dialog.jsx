import * as React from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';

/**
 * Pairs with useUnsavedChanges():
 *
 *   const guard = useUnsavedChanges(isDirty);
 *   ...
 *   <UnsavedChangesDialog guard={guard} />
 */
export function UnsavedChangesDialog({ guard }) {
  if (!guard.isPrompting) return null;
  return (
    <ConfirmDialog
      title="Leave without saving?"
      message="You have unsaved changes on this form. If you leave now they will be lost."
      confirmLabel="Leave"
      cancelLabel="Stay"
      variant="danger"
      icon="warning"
      onConfirm={guard.confirm}
      onCancel={guard.cancel}
    />
  );
}
