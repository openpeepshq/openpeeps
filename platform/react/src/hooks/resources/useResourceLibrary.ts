import { useMemo, useState } from 'react';
import type { PublicPost, ResourceKind } from '@openpeepshq/common/types';
import {
  categoryTreeFromPaths,
  normalizeResourceTags,
  pathStartsWith,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useFeedListParams } from '../useResolvedFeedFormat';

export const useResourceLibrary = (groupId?: string) => {
  const { openpeepsApi } = useOpenpeeps();
  const params = useFeedListParams({ format: 'linear' });
  const query = openpeepsApi.usePostsByType('resource', {
    ...params,
    ...(groupId ? { groupId } : { ungrouped: 'true' as const }),
  });

  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<ResourceKind | 'all'>('all');
  const [tag, setTag] = useState<string | null>(null);
  const [pathPrefix, setPathPrefix] = useState<string[]>([]);
  const [hierarchy, setHierarchy] = useState(false);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (post.data?.type !== 'resource') return false;
      const resource = post.data;
      if (kind !== 'all' && resource.resourceKind !== kind) return false;
      if (tag && !normalizeResourceTags(resource.tags).includes(tag)) {
        return false;
      }
      if (
        pathPrefix.length &&
        !pathStartsWith(resource.categoryPath ?? [], pathPrefix)
      ) {
        return false;
      }
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
  }, [kind, pathPrefix, posts, search, tag]);

  return {
    query,
    posts: filtered,
    tags,
    tree,
    search,
    setSearch,
    kind,
    setKind,
    tag,
    setTag,
    pathPrefix,
    setPathPrefix,
    hierarchy,
    setHierarchy,
  };
};
