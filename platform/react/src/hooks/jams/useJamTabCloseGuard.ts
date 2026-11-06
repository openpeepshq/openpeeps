import { useEffect, useRef } from 'react';
import { useT } from '../../i18n';

/**
 * Arms the browser leave prompt. `returnValue` must be truthy; browsers
 * ignore custom copy and show their own dialog. Returning a value only
 * counts when the handler is also assigned to `window.onbeforeunload`
 * (Safari uses that path for the tab-close button).
 */
export const confirmJamTabClose = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = true;
  return true;
};

/**
 * Back within the app does not unload the document, so `beforeunload` never
 * runs. Undo that pop and let the caller ask. `history.go(1)` returns to the
 * jam entry without stacking a duplicate, which would make the next back a
 * no-op.
 */
export const rejectJamBackNavigation = (event: PopStateEvent) => {
  event.stopImmediatePropagation();
  window.history.go(1);
};

/**
 * Warn before a live jam is discarded.
 *
 * - Reload and the tab X use the browser prompt (`beforeunload` and
 *   `onbeforeunload`).
 * - The browser back button is an in-app history pop, so it confirms and
 *   then either stays or lets the router proceed.
 *
 * The warning stays armed if the call drops while the document is already
 * hidden. Otherwise a disconnect during tab close removes the handler before
 * the browser asks.
 */
export const useJamTabCloseGuard = (active: boolean) => {
  const t = useT();
  const activeRef = useRef(active);
  const warnRef = useRef(false);
  activeRef.current = active;
  if (active) warnRef.current = true;
  else if (
    typeof document === 'undefined' ||
    document.visibilityState === 'visible'
  ) {
    warnRef.current = false;
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const message = () =>
      t('jams.exit.description', {
        defaultValue: 'Are you sure you want to exit this jam?',
      });

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!warnRef.current) return;
      return confirmJamTabClose(event);
    };

    // Set when the forward step after a cancelled back fires its own pop.
    let restoring = false;
    const onPopState = (event: PopStateEvent) => {
      if (restoring) {
        restoring = false;
        event.stopImmediatePropagation();
        return;
      }
      if (!activeRef.current) return;
      if (window.confirm(message())) {
        warnRef.current = false;
        activeRef.current = false;
        return;
      }
      restoring = true;
      rejectJamBackNavigation(event);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !activeRef.current) {
        warnRef.current = false;
      }
    };

    const previousOnBeforeUnload = window.onbeforeunload;
    window.addEventListener('beforeunload', onBeforeUnload);
    window.onbeforeunload = onBeforeUnload;
    window.addEventListener('popstate', onPopState, true);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (window.onbeforeunload === onBeforeUnload) {
        window.onbeforeunload = previousOnBeforeUnload;
      }
      window.removeEventListener('popstate', onPopState, true);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [t]);
};
