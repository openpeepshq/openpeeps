import { BASE_URL } from './constants';

export const toAbsoluteMediaUrl = (
  url?: string,
): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/') && BASE_URL?.trim()) {
    return `${BASE_URL.replace(/\/$/, '')}${url}`;
  }
  return url;
};
