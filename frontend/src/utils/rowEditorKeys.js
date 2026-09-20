/**
 * Enter saves the row being edited, Escape abandons it — so a register can be
 * filled in without reaching for the mouse on every line.
 *
 * Attach to the element wrapping one row's inputs:
 *   <tr onKeyDown={rowEditorKeys({ onSave, onCancel, saving })}>
 *
 * Enter is left alone inside a textarea, where it means a new line, and while
 * a save is already running. A SearchSelect stops Enter and Escape itself
 * while its list is open, so choosing an option does not also save the row.
 */
export function rowEditorKeys({ onSave, onCancel, saving = false } = {}) {
  return (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (!saving) onSave?.();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (!saving) onCancel?.();
    }
  };
}
