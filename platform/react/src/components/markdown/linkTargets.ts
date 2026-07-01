/** Mirrors Svelte `OpenpeepsMarkdown` / `a.svelte` external-link detection. */
export const isExternalLink = (href: string, origin?: string): boolean => {
  if (!href || /^(mailto:|tel:|#)/.test(href)) {
    return false;
  }
  if (href.startsWith('/') && !href.startsWith('//')) {
    return false;
  }
  if (!origin) {
    return !href.startsWith('/');
  }
  try {
    return new URL(href, origin).origin !== origin;
  } catch {
    return !href.startsWith('/');
  }
};

export const linkOpensInNewTab = (
  href: string | null | undefined,
  origin: string | undefined,
  newTab: boolean,
): boolean => {
  if (!href) {
    return false;
  }
  if (newTab) {
    return true;
  }
  return isExternalLink(href, origin);
};
