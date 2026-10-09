import { useEffect, useRef } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  bottomSheetDismiss,
  bottomSheetPresent,
} from '../lib/bottom-sheet-ref';

/** Drives an imperative bottom sheet from web-style `open`/`onClose` props. */
export const useControlledSheet = (open: boolean) => {
  const ref = useRef<BottomSheetModal>(null);
  useEffect(() => {
    if (open) bottomSheetPresent(ref);
    else bottomSheetDismiss(ref);
  }, [open]);
  return ref;
};
