const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isPostPath = (path: string) =>
  path.startsWith('/posts/') && UUID_RE.test(path.substring(7));

export const isJamPath = (path: string) =>
  path.startsWith('/events/') &&
  UUID_RE.test(path.substring(8, 44)) &&
  path.endsWith('/jam');

export const isGroupPath = (path: string) => path.startsWith('/groups/@');

export const isLocalLink = (url: string, origin: string) => {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.origin === origin &&
      (isPostPath(urlObj.pathname) ||
        isJamPath(urlObj.pathname) ||
        isGroupPath(urlObj.pathname))
    );
  } catch {
    return false;
  }
};

export const isValidUrl = (url?: string) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isEmail = (url: string) =>
  /^mailto:|^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url);

export const extractUrlsFromText = (text?: string) =>
  text?.match(/\bhttps?:\/\/\S+/gi) ?? [];
