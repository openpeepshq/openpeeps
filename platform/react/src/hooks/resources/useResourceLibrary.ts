import { useMemo, useState } from 'react';
import type { PublicPost, ResourceKind } from '@openpeepshq/common/types';
import {
  categoryTreeFromPaths,
  normalizeResourceTags,
  pathStartsWith,
  RESOURCE_KINDS,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useFeedListParams } from '../useResolvedFeedFormat';

/** Query params the web pages use to persist library filters in the URL. */
export type ResourceLibraryFilterParam = 'kind' | 'tags' | 'path';

export type ResourceLibraryUrlState = {
  get: (name: ResourceLibraryFilterParam) => string | null;
  set: (name: ResourceLibraryFilterParam, value: string | null) => void;
};

const parseKind = (value: string | null): ResourceKind | 'all' =>
  value && (RESOURCE_KINDS as readonly string[]).includes(value)
    ? (value as ResourceKind)
    : 'all';

export const useResourceLibrary = (
  groupId?: string,
  ungrouped?: boolean,
  url?: ResourceLibraryUrlState,
) => {
  const { openpeepsApi } = useOpenpeeps();
  const params = useFeedListParams({ format: 'linear' });
  const query = openpeepsApi.usePostsByType('resource', {
    ...params,
    ...(groupId
      ? { groupId }
      : ungrouped
        ? { ungrouped: 'true' as const }
        : {}),
  });
  const bookmarkedIds = openpeepsApi.useCurrentProfileBookmarkedIds();

  const [search, setSearch] = useState('');
  const [kind, setKindState] = useState<ResourceKind | 'all'>(() =>
    parseKind(url?.get('kind') ?? null),
  );
  const [selectedTags, setSelectedTagsState] = useState<string[]>(
    () => url?.get('tags')?.split(',').filter(Boolean) ?? [],
  );
  const [pathPrefix, setPathPrefixState] = useState<string[]>(
    () => url?.get('path')?.split('/').filter(Boolean) ?? [],
  );
  const [hierarchy, setHierarchy] = useState(false);
  const [view, setView] = useState<'list' | 'cards'>('cards');
  const [saved, setSaved] = useState(false);

  const posts = useMemo(() => {
    const flat = (query.data?.pages ?? []).flat();
    const seen = new Set<string>();
    const out: PublicPost[] = [];
    for (const post of flat) {
      if (seen.has(post.id) || post.type !== 'resource') continue;
      seen.add(post.id);
      out.push(post);
    }
    return out;
  }, [query.data]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      if (post.data?.type !== 'resource') continue;
      for (const value of normalizeResourceTags(post.data.tags)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [posts]);

  const tree = useMemo(
    () =>
      categoryTreeFromPaths(
        posts.flatMap((post) =>
          post.data?.type === 'resource' && post.data.categoryPath?.length
            ? [post.data.categoryPath]
            : [],
        ),
      ),
    [posts],
  );

  const setKind = (value: ResourceKind | 'all') => {
    setKindState(value);
    url?.set('kind', value === 'all' ? null : value);
  };

  const setSelectedTags = (tags: string[]) => {
    setSelectedTagsState(tags);
    url?.set('tags', tags.length ? tags.join(',') : null);
  };

  const setPathPrefix = (path: string[]) => {
    setPathPrefixState(path);
    url?.set('path', path.length ? path.join('/') : null);
  };

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const bookmarked = new Set(bookmarkedIds.data ?? []);
    return posts.filter((post) => {
      if (post.data?.type !== 'resource') return false;
      const resource = post.data;
      if (kind !== 'all' && resource.resourceKind !== kind) return false;
      if (selectedTags.length > 0) {
        const resourceTagSet = new Set(normalizeResourceTags(resource.tags));
        if (!selectedTags.every((t) => resourceTagSet.has(t))) return false;
      }
      if (
        pathPrefix.length &&
        !pathStartsWith(resource.categoryPath ?? [], pathPrefix)
      ) {
        return false;
      }
      if (saved && !bookmarked.has(post.id)) return false;
      if (!q) return true;
      const hay = [
        resource.title,
        resource.content,
        ...(resource.tags ?? []),
        ...(resource.categoryPath ?? []),
        resource.url,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [
    kind,
    pathPrefix,
    posts,
    search,
    selectedTags,
    saved,
    bookmarkedIds.data,
  ]);

  const activeFilterCount = useMemo(
    () =>
      (kind !== 'all' ? 1 : 0) +
      (selectedTags.length ? 1 : 0) +
      (pathPrefix.length ? 1 : 0) +
      (search.trim() ? 1 : 0) +
      (saved ? 1 : 0),
    [kind, pathPrefix, search, selectedTags, saved],
  );

  const clearAllFilters = () => {
    setKind('all');
    setSelectedTags([]);
    setPathPrefix([]);
    setSearch('');
    setSaved(false);
  };

  const [tagsOpen, setTagsOpen] = useState(false);

  return {
    query,
    posts: filtered,
    tags,
    tree,
    search,
    setSearch,
    kind,
    setKind,
    selectedTags,
    setSelectedTags,
    toggleTag,
    pathPrefix,
    setPathPrefix,
    hierarchy,
    setHierarchy,
    view,
    setView,
    saved,
    setSaved,
    activeFilterCount,
    clearAllFilters,
    tagsOpen,
    setTagsOpen,
  };
};
