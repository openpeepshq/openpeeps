import RNFS from 'react-native-fs';
import RNConvertPhAsset from 'react-native-convert-ph-asset';

type UploadMediaType = {
  mediaUri: string;
  createAttachments: (data: any) => Promise<any>;
  type: 'image' | 'video' | 'audio' | 'document';
  usage: string;
  alt?: string;
  name?: string | null;
  mimeType?: string | null;
  setUploadingMedia?: React.Dispatch<
    React.SetStateAction<{[key: string]: boolean}>
  >;
};

export const uploadMedia = async ({
  mediaUri,
  createAttachments,
  type,
  usage,
  alt,
  name,
  mimeType,
  setUploadingMedia,
}: UploadMediaType) => {
  let finalUri = mediaUri;

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
    if (mimeType) {
      finalMimeType = mimeType;
    }
  }

  const tempFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

  if (setUploadingMedia) {
    setUploadingMedia(prev => ({ ...prev, [mediaUri]: true }));
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

  if (mediaUri.startsWith('content://')) {
    const destPath = `${RNFS.CachesDirectoryPath}/${tempFileName}`;

    try {
      if (await RNFS.exists(destPath)) {
        await RNFS.unlink(destPath);
      }

      await RNFS.copyFile(mediaUri, destPath);
      finalUri = `file://${destPath}`;
    } catch (error) {
      console.error('Failed to copy content:// file:', error);
      return null;
    }
  }

  try {
    const cleanPath = finalUri.replace('file://', '');
    const fileStat = await RNFS.stat(cleanPath);

    const file = {
      uri: finalUri,
      name: name || `${type}_${Date.now()}.${fileExtension}`,
      type: finalMimeType,
      size: fileStat.size,
    };

    const mediaAttachment = await createAttachments({
      file: file as unknown as File,
      usage: usage,
      description: alt,
    });

    return {
      type: type,
      url: mediaAttachment.url,
      previewUrl: mediaAttachment.previewUrl,
      textUrl: null,
      filename: mediaAttachment.filename || file.name,
      meta: { usage: type },
      description: mediaAttachment.description,
      blurhash: mediaAttachment.blurhash,
    };
  } catch (error) {
    console.error(
      `Failed to upload ${type}: ${mediaUri}`,
      error,
    );
    return null;
  } finally {
    if (setUploadingMedia) {
      setUploadingMedia(prev => ({...prev, [mediaUri]: false}));
    }
  }
};