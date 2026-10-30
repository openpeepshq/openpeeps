import { useMemo, useState } from 'react';
import type { PublicPost, ResourceKind } from '@openpeepshq/common/types';
import {
  categoryTreeFromPaths,
  normalizeResourceTags,
  pathStartsWith,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useFeedListParams } from '../useResolvedFeedFormat';

export const useResourceLibrary = (groupId?: string, ungrouped?: boolean) => {
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
  const [kind, setKind] = useState<ResourceKind | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pathPrefix, setPathPrefix] = useState<string[]>([]);
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

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

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
