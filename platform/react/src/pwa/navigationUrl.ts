/**
 * React Router path helpers treat strings with a scheme as relative pathnames
 * (e.g. `https://host/posts/1` → `/https:/host/posts/1`). Convert same-origin
 * absolute URLs to path+search+hash before handing them to a router navigate.
 */
export const toRouterPath = (
  url: string,
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
): string => {
  if (!url || !origin) return url;
  try {
    if (!(url.startsWith('http://') || url.startsWith('https://'))) {
      return url;
    }
    const parsed = new URL(url);
    if (parsed.origin !== origin) return url;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
};

/** Path after the `goto:` prefix (supports absolute or relative targets). */
export const parseGotoAction = (action: string): string => {
  if (!action.startsWith('goto:')) return '/';
  return action.slice('goto:'.length) || '/';
};

/**
 * Resolve a `goto:` action to an absolute URL for openWindow / Client.navigate,
 * and a same-origin router path for in-page NAVIGATE_TO messages.
 */
export const resolveGotoTarget = (
  action: string,
  origin: string,
  basePath: string = '/',
): { absoluteUrl: string; routerPath: string } => {
  const gotoPath = parseGotoAction(action);

  let absoluteUrl: string;
  if (gotoPath.startsWith('http://') || gotoPath.startsWith('https://')) {
    absoluteUrl = gotoPath;
  } else {
    const normalizedBase =
      basePath === '/'
        ? ''
        : basePath.endsWith('/')
          ? basePath.slice(0, -1)
          : basePath;
    const normalizedRel = gotoPath.startsWith('/') ? gotoPath : `/${gotoPath}`;
    absoluteUrl = new URL(
      `${normalizedBase}${normalizedRel}`,
      origin,
    ).toString();
  }

  return {
    absoluteUrl,
    routerPath: toRouterPath(absoluteUrl, origin),
  };
};
