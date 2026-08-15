import { useEffect, useState } from 'react';
import { toAbsoluteMediaUrl } from '~/lib/media-url';
import { fetchCachedMedia } from '~/utils/media-cache';

const LOCAL_URI_PREFIXES = [
  'file://',
  'data:',
  'content://',
  'ph://',
  'assets-library://',
] as const;

export const isLocalMediaUri = (url: string) =>
  LOCAL_URI_PREFIXES.some((prefix) => url.startsWith(prefix));

/**
 * Resolve a remote media URL through the on-disk cache. Shows the network URL
 * immediately, then swaps to the cached file once the download finishes.
 * Local picker / file URIs are returned unchanged.
 */
export const useCachedMediaUri = (url?: string | null) => {
  const [uri, setUri] = useState<string | undefined>(() => {
    if (!url) {
      return undefined;
    }
    if (isLocalMediaUri(url)) {
      return url;
    }
    return toAbsoluteMediaUrl(url) ?? url;
  });

  useEffect(() => {
    if (!url) {
      setUri(undefined);
      return;
    }

    if (isLocalMediaUri(url)) {
      setUri(url);
      return;
    }

    const remote = toAbsoluteMediaUrl(url) ?? url;
    setUri(remote);

    let cancelled = false;
    void fetchCachedMedia(url, 'image').then((cached) => {
      if (!cancelled && cached) {
        setUri(cached);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return uri;
};
