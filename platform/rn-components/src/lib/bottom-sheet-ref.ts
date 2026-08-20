import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { ForwardedRef, MutableRefObject, RefObject } from 'react';

type BottomSheetRefArg =
  | ForwardedRef<BottomSheetModal>
  | RefObject<BottomSheetModal | null>
  | MutableRefObject<BottomSheetModal | null>
  | null
  | undefined;

function getSheetInstance(
  ref: BottomSheetRefArg
): BottomSheetModal | null | undefined {
  if (ref == null || typeof ref === 'function') {
    return undefined;
  }
  return ref.current;
}

export function bottomSheetClose(ref: BottomSheetRefArg): void {
  getSheetInstance(ref)?.close();
}

export function bottomSheetDismiss(ref: BottomSheetRefArg): void {
  getSheetInstance(ref)?.dismiss();
}

export function bottomSheetPresent(ref: BottomSheetRefArg): void {
  getSheetInstance(ref)?.present();
}
