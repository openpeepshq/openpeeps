import RNFS from 'react-native-fs';
import { toAbsoluteMediaUrl } from '../lib/media-url';

interface CacheMetadata {
  path: string;
  timestamp: number;
  mediaType: 'image' | 'video' | 'audio';
}

const CACHE_EXPIRATION = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
const MEDIA_CACHE_DIR = `${RNFS.DocumentDirectoryPath}/media-cache`;

export const getCacheMetadata = async (
  path: string,
): Promise<CacheMetadata | null> => {
  try {
    const metadataPath = `${path}.metadata`;
    const exists = await RNFS.exists(metadataPath);
    if (exists) {
      const data = await RNFS.readFile(metadataPath);
      return JSON.parse(data);
    }
    return null;
  } catch {
    return null;
  }
};

export const saveCacheMetadata = async (
  path: string,
  mediaType: 'image' | 'video' | 'audio',
) => {
  const metadata: CacheMetadata = {
    path,
    timestamp: Date.now(),
    mediaType,
  };
  await RNFS.writeFile(`${path}.metadata`, JSON.stringify(metadata), 'utf8');
};

export const cleanupExpiredCache = async (path: string) => {
  try {
    const metadata = await getCacheMetadata(path);
    if (metadata && Date.now() - metadata.timestamp > CACHE_EXPIRATION) {
      await RNFS.unlink(path);
      await RNFS.unlink(`${path}.metadata`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const getProperFileExtension = (
  url: string,
  mediaType: 'image' | 'video' | 'audio',
): string => {
  const extension = url?.split('.').pop()?.toLowerCase() || '';

  const supportedFormats = {
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    video: ['mp4', 'm4v', 'mov', 'webm'],
    audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac'],
  };

  if (supportedFormats[mediaType].includes(extension)) {
    return extension;
  }

  // Default extensions if not recognized
  const defaultExtensions = {
    image: 'jpg',
    video: 'mp4',
    audio: 'mp3',
  };

  return defaultExtensions[mediaType];
};

export const generateUniqueFileName = (
  url: string,
  mediaType: 'image' | 'video' | 'audio',
): string => {
  const urlHash = url?.split('').reduce((hash, char) => {
    // eslint-disable-next-line no-bitwise
    return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }, 0);
  const extension = getProperFileExtension(url, mediaType);
  return `${mediaType}_${Math.abs(urlHash)}.${extension}`;
};

export const fetchCachedMedia = async (
  url: string,
  mediaType: 'image' | 'video' | 'audio',
  progressCallback?: (progress: number) => void,
): Promise<string | undefined> => {
  try {
    const resolvedUrl = toAbsoluteMediaUrl(url);

    if (!resolvedUrl) {
      return;
    }

    await RNFS.mkdir(MEDIA_CACHE_DIR);

    const uniqueFileName = generateUniqueFileName(resolvedUrl, mediaType);
    const path = `${MEDIA_CACHE_DIR}/${uniqueFileName}`;

    const isExpired = await cleanupExpiredCache(path);
    const fileExists = !isExpired && (await RNFS.exists(path));

    if (!fileExists) {
      if (await RNFS.exists(path)) {
        await RNFS.unlink(path);
      }
      if (await RNFS.exists(`${path}.metadata`)) {
        await RNFS.unlink(`${path}.metadata`);
      }

      const { promise } = RNFS.downloadFile({
        fromUrl: resolvedUrl,
        toFile: path,
        headers: {
          Accept: '*/*',
          'Content-Type': '*/*',
        },
        progress: response => {
          const progress =
            (response.bytesWritten / response.contentLength) * 100;
          if (progressCallback) {
            progressCallback(progress);
          }
        },
      });

      await promise;
      await saveCacheMetadata(path, mediaType);
    }

    const finalFileExists = await RNFS.exists(path);
    if (!finalFileExists) {
      throw new Error('File does not exist after download');
    }

    return `file://${path}`;
  } catch (err) {
    console.error(`Error downloading ${mediaType}:`, err);
    return toAbsoluteMediaUrl(url); // Fallback to original URL
  }
};
