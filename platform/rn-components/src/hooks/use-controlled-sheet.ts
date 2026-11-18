import { useEffect, useRef } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  bottomSheetDismiss,
  bottomSheetPresent,
} from '../lib/bottom-sheet-ref';

/** Drives an imperative bottom sheet from web-style `open`/`onClose` props. */
export const useControlledSheet = (open: boolean) => {
  const ref = useRef<BottomSheetModal>(null);
  // Fired once per hook instance so a missing provider can't spam on every
  // open attempt.
  const warnedMissingProvider = useRef(false);
  useEffect(() => {
    if (open) {
      if (!ref.current) {
        // The sheet instance never attached: the modal subtree either failed
        // to mount or unmounted before this effect ran.
        console.error(
          'useControlledSheet: no bottom sheet instance to present — the ' +
            'sheet never mounted.'
        );
        if (!warnedMissingProvider.current) {
          warnedMissingProvider.current = true;
          console.warn(
            'useControlledSheet: no sheet instance on first open. If this ' +
              'happens for every sheet, the app root is missing ' +
              '<BottomSheetModalProvider> from @gorhom/bottom-sheet.'
          );
        }
        return;
      }
      bottomSheetPresent(ref);
    } else {
      bottomSheetDismiss(ref);
    }
  }, [open]);
  return ref;
};
