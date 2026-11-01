import type { ResourceKind } from '@openpeepshq/common/types';
import { RESOURCE_KINDS } from '@openpeepshq/common/lib';
import type { ResourceLibraryFilters } from '../../hooks';

export type { ResourceLibraryFilters };

/**
 * Read the shareable resource-library filters back out of a URL, tolerating a
 * hand-edited query string (an invalid `kind` is ignored rather than surfaced).
 */
export const filtersFromUrl = (
  params: URLSearchParams,
): ResourceLibraryFilters => {
  const kind = params.get('kind');
  const validKind =
    kind === 'all' || RESOURCE_KINDS.includes(kind as ResourceKind)
      ? (kind as ResourceKind | 'all')
      : undefined;
  const tags = params.get('tags')
    ? params
        .get('tags')!
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const path = params.get('path')
    ? params
        .get('path')!
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  return {
    kind: validKind,
    saved: params.get('saved') === '1',
    tags,
    path,
  };
};

/**
 * Serialize the active filters into a URL so a filtered view survives reloads
 * and can be shared. Defaults are omitted to keep the URL clean, and any other
 * existing query params are preserved.
 */
export const filtersToUrl = (
  base: URLSearchParams,
  f: ResourceLibraryFilters,
): URLSearchParams => {
  const p = new URLSearchParams(base);
  p.delete('kind');
  p.delete('saved');
  p.delete('tags');
  p.delete('path');
  if (f.kind && f.kind !== 'all') p.set('kind', f.kind);
  if (f.saved) p.set('saved', '1');
  if (f.tags?.length) p.set('tags', f.tags.join(','));
  if (f.path?.length) p.set('path', f.path.join('/'));
  return p;
};
