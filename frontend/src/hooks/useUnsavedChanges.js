import { useEffect, useRef, useState, useCallback } from 'react';
import { useBeforeUnload } from 'react-router-dom';

/**
 * useUnsavedChanges — guard against losing form input.
 *
 * - Warns on browser/tab close (native beforeunload) while `dirty`.
 * - Exposes an in-app confirm helper for router navigations: wrap your
 *   "leave" actions (back button, cancel, nav links) with `confirmLeave`.
 *
 *   const { confirmLeave, prompt } = useUnsavedChanges(formState.isDirty);
 *   ...
 *   <Button onClick={() => confirmLeave(() => navigate('/jobcards'))}>Cancel</Button>
 *   {prompt}   // renders the ConfirmDialog when needed
 *
 * (Kept intentionally lightweight — it does not block Link clicks
 * globally, so it never fights React Router's data APIs.)
 */
export function useUnsavedChanges(dirty) {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const [pending, setPending] = useState(null); // () => void

  useBeforeUnload(
    useCallback(
      (e) => {
        if (dirtyRef.current) {
          e.preventDefault();
          e.returnValue = '';
        }
      },
      []
    )
  );

  const confirmLeave = useCallback((proceed) => {
    if (!dirtyRef.current) {
      proceed();
      return;
    }
    setPending(() => proceed);
  }, []);

  const cancel = useCallback(() => setPending(null), []);
  const confirm = useCallback(() => {
    const fn = pending;
    setPending(null);
    fn?.();
  }, [pending]);

  return { confirmLeave, isPrompting: pending != null, cancel, confirm };
}
