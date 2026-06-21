import RNFS from 'react-native-fs';
import RNConvertPhAsset from 'react-native-convert-ph-asset';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import type { MediaAttachment } from '@openpeeps/common';
import i18next from '~/i18n';

type UploadProgressInfo = {
  loaded: number;
  total: number;
  percent: number;
  estimatedRemainingMs?: number;
};

export type UploadProgressMap = {
  [key: string]: { percent: number; estimatedRemainingMs?: number };
};

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

const decodeFileUri = (uri: string): string => {
  if (!uri.startsWith('file://')) {
    return uri;
  }
  try {
    return decodeURI(uri);
  } catch {
    return uri;
  }
};

const inferMimeFromFilename = (name: string): string | undefined => {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[ext];
};

const resolveDocumentMime = (
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

type UploadMediaType = {
  mediaUri: string;
  createAttachments: (
    data: any,
    pathParams?: undefined,
    queryParams?: undefined,
    headers?: Record<string, string>,
    onUploadProgress?: (info: UploadProgressInfo) => void
  ) => Promise<any>;
  type: 'image' | 'video' | 'audio' | 'document';
  usage: string;
  alt?: string;
  name?: string | null;
  mimeType?: string | null;
  setUploadProgress?: React.Dispatch<React.SetStateAction<UploadProgressMap>>;
};

export const uploadMedia = async ({
  mediaUri,
  createAttachments,
  type,
  usage,
  alt,
  name,
  mimeType,
  setUploadProgress,
}: UploadMediaType) => {
  const decodedMediaUri = decodeFileUri(mediaUri);
  let finalUri = decodedMediaUri;

  let fileExtension = 'bin';
  let finalMimeType = 'application/octet-stream';

  if (type === 'video') {
    fileExtension = 'mp4';
    finalMimeType = 'video/mp4';
  } else if (type === 'image') {
    fileExtension = 'jpg';
    finalMimeType = 'image/jpeg';
  } else if (type === 'document') {
    if (name) {
      const extractedExt = name.split('.').pop();
      if (extractedExt && extractedExt !== name) {
        fileExtension = extractedExt;
      }
    }
    finalMimeType = resolveDocumentMime(mimeType, name);
  }

  const tempFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

  if (setUploadProgress) {
    setUploadProgress((prev) => ({
      ...prev,
      [mediaUri]: { percent: 0, estimatedRemainingMs: undefined },
    }));
  }

  if (mediaUri.startsWith('ph://')) {
    const destPath = `${RNFS.TemporaryDirectoryPath}/${tempFileName}`;

    if (type === 'image') {
      try {
        await RNFS.copyAssetsFileIOS(mediaUri, destPath, 1024, 1024);
        finalUri = `file://${destPath}`;
      } catch (copyError) {
        const base64Data = await RNFS.readFile(mediaUri, 'base64');
        await RNFS.writeFile(destPath, base64Data, 'base64');
        finalUri = `file://${destPath}`;
      }
    } else if (type === 'video') {
      try {
        const res = await RNConvertPhAsset.convertVideoFromUrl({
          url: mediaUri,
          convertTo: 'mov',
          quality: 'medium',
        });
        finalUri = res.path;
      } catch (videoError) {
        console.error('Failed to convert ph:// video asset:', videoError);
        return null;
      }
    }
  }

  // iOS document picker import mode already copies into the app sandbox;
  // copying again often fails on encoded paths. Android needs content:// copied.
  const shouldCopyPickerFile =
    decodedMediaUri.startsWith('content://') ||
    (Platform.OS === 'android' && decodedMediaUri.startsWith('file://'));

  if (shouldCopyPickerFile) {
    const destPath = `${RNFS.CachesDirectoryPath}/${tempFileName}`;

    try {
      if (await RNFS.exists(destPath)) {
        await RNFS.unlink(destPath);
      }

      await RNFS.copyFile(decodedMediaUri, destPath);
      finalUri = `file://${destPath}`;
    } catch (error) {
      console.error('Failed to copy picker file:', error);
      return null;
    }
  }

  try {
    const cleanPath = finalUri.replace(/^file:\/\//, '');
    const fileStat = await RNFS.stat(cleanPath);

    const file = {
      uri: finalUri,
      name: name || `${type}_${Date.now()}.${fileExtension}`,
      type: finalMimeType,
      size: fileStat.size,
    };

    const mediaAttachment: MediaAttachment = await createAttachments(
      {
        file: file as unknown as File,
        usage: usage,
        description: alt,
      },
      undefined,
      undefined,
      undefined,
      ({ percent, estimatedRemainingMs }) => {
        if (setUploadProgress) {
          setUploadProgress((prev) => ({
            ...prev,
            [mediaUri]: { percent, estimatedRemainingMs },
          }));
        }
      }
    );

    return {
      id: mediaAttachment.id,
      type: mediaAttachment.type ?? type,
      url: mediaAttachment.url,
      previewUrl: mediaAttachment.previewUrl,
      textUrl: null,
      filename: mediaAttachment.filename || file.name,
      meta: {
        usage: mediaAttachment.meta?.usage ?? usage,
        mimetype: mediaAttachment.meta?.mimetype ?? finalMimeType,
        size: fileStat.size,
      },
      description: mediaAttachment.description,
      blurhash: mediaAttachment.blurhash,
      status: mediaAttachment.status,
    };
  } catch (error) {
    console.error(`Failed to upload ${type}: ${mediaUri}`, error);
    const reason = error instanceof Error ? error.message : undefined;
    Toast.show({
      type: 'error',
      text1: i18next.t('form.upload.failed'),
      text2: reason,
    });
    return null;
  } finally {
    if (setUploadProgress) {
      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[mediaUri];
        return next;
      });
    }
  }
};
