import RNFS from 'react-native-fs';
import { toAbsoluteMediaUrl } from '~/lib/media-url';

interface CacheMetadata {
  path: string;
  timestamp: number;
  mediaType: 'image' | 'video' | 'audio';
}

const MEDIA_CACHE_DIR = `${RNFS.DocumentDirectoryPath}/media-cache`;
const inFlightDownloads = new Map<string, Promise<RNFS.DownloadResult>>();

/** Drop RN cache-bust query params so hashed media URLs share one cache key. */
export const stableMediaUrl = (url: string): string => {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return url;
  }
  const base = url.slice(0, queryIndex);
  const params = url
    .slice(queryIndex + 1)
    .split('&')
    .filter((part) => part.length > 0 && !part.startsWith('cache='));
  return params.length > 0 ? `${base}?${params.join('&')}` : base;
};

const unlinkIfExists = async (path: string) => {
  try {
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
  } catch {
    // Another request may have cleaned the same cache entry first.
  }
};

export const getCacheMetadata = async (
  path: string
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
  mediaType: 'image' | 'video' | 'audio'
) => {
  const metadata: CacheMetadata = {
    path,
    timestamp: Date.now(),
    mediaType,
  };
  await RNFS.writeFile(`${path}.metadata`, JSON.stringify(metadata), 'utf8');
};

export const getProperFileExtension = (
  url: string,
  mediaType: 'image' | 'video' | 'audio'
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
  mediaType: 'image' | 'video' | 'audio'
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
  progressCallback?: (progress: number) => void
): Promise<string | undefined> => {
  try {
    const resolvedUrl = toAbsoluteMediaUrl(url);

    if (!resolvedUrl) {
      return;
    }

    // Content-hashed media URLs are immutable; cache them indefinitely.
    const cacheKeyUrl = stableMediaUrl(resolvedUrl);

    await RNFS.mkdir(MEDIA_CACHE_DIR);

    const uniqueFileName = generateUniqueFileName(cacheKeyUrl, mediaType);
    const path = `${MEDIA_CACHE_DIR}/${uniqueFileName}`;

    const fileExists = await RNFS.exists(path);

    if (!fileExists) {
      if (!inFlightDownloads.has(path)) {
        await unlinkIfExists(path);
        await unlinkIfExists(`${path}.metadata`);

        const { promise } = RNFS.downloadFile({
          fromUrl: cacheKeyUrl,
          toFile: path,
          headers: {
            'Accept': '*/*',
            'Content-Type': '*/*',
          },
          progress: (response) => {
            const progress =
              (response.bytesWritten / response.contentLength) * 100;
            if (progressCallback) {
              progressCallback(progress);
            }
          },
        });

        inFlightDownloads.set(
          path,
          promise.finally(() => {
            inFlightDownloads.delete(path);
          })
        );
      }

      const downloadResult = await inFlightDownloads.get(path)!;
      const existsAfterDownload = await RNFS.exists(path);
      if (
        downloadResult.statusCode < 200 ||
        downloadResult.statusCode >= 300 ||
        !existsAfterDownload
      ) {
        await unlinkIfExists(path);
        await unlinkIfExists(`${path}.metadata`);
        return resolvedUrl;
      }
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
