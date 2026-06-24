import { InteractionManager, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import type { ForwardedRef, RefObject } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { bottomSheetClose } from '~/lib/bottom-sheet-ref';

const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
};

export const decodeFileUri = (uri: string): string => {
  if (!uri.startsWith('file://')) {
    return uri;
  }
  try {
    return decodeURI(uri);
  } catch {
    return uri;
  }
};

export const inferMimeFromFilename = (name: string): string | undefined => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[ext];
};

export const resolveDocumentMime = (
  mimeType: string | null | undefined,
  name: string | null | undefined,
): string => {
  if (mimeType?.includes('/')) {
    return mimeType;
  }
  if (name) {
    const inferred = inferMimeFromFilename(name);
    if (inferred) {
      return inferred;
    }
  }
  return 'application/octet-stream';
};

/** Path/URL for react-native-image-crop-picker (file:// on iOS, bare path on Android). */
export const toCropperPath = async (uri: string): Promise<string> => {
  const decoded = decodeFileUri(uri);
  if (Platform.OS === 'ios' && decoded.startsWith('ph://')) {
    const dest = `${RNFS.TemporaryDirectoryPath}/pick_${Date.now()}.jpg`;
    await RNFS.copyAssetsFileIOS(decoded, dest, 0, 0);
    return `file://${dest}`;
  }
  if (Platform.OS === 'android' && decoded.startsWith('file://')) {
    return decoded.replace(/^file:\/\//, '');
  }
  // iOS openCropper loads via NSURLRequest and requires a file:// URL.
  return decoded;
};

type SheetRef =
  | ForwardedRef<BottomSheetModal>
  | RefObject<BottomSheetModal | null>
  | null
  | undefined;

/** Bottom sheets block iOS QuickLook / cropper modals unless dismissed first. */
export const dismissSheetForNativeModal = async (
  ref: SheetRef,
): Promise<void> => {
  bottomSheetClose(ref);
  await new Promise<void>(resolve => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, Platform.OS === 'ios' ? 500 : 100);
    });
  });
};

export const isPickerCancelled = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const code = (error as { code?: string }).code;
  return code === 'E_PICKER_CANCELLED' || code === 'CANCELED';
};
