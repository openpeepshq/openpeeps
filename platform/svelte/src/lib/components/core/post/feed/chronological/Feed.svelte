<script lang="ts">
  import type {
    PublicPost,
    SuccessFailureResponse,
  } from '@openpeeps/common/types';
  import type {
    CreateInfiniteQueryResult,
    InfiniteData,
  } from '@tanstack/svelte-query';
  import { Rss } from 'lucide-svelte';
  import { hasValue } from '@openpeeps/common/lib';
  import { InfiniteScrollContainer } from '@openpeeps/ui';
  import { FeedPost } from '../..';
  import PinnedPost from './PinnedPost.svelte';
  import { i18nContext } from '$lib/components/i18n';

  interface Props {
    query: CreateInfiniteQueryResult<
      InfiniteData<PublicPost[], unknown>,
      SuccessFailureResponse
    >;
    inGroup?: boolean;
    pinnedPostId?: string;
  }

  let { query, inGroup = false, pinnedPostId }: Props = $props();

  const { t } = i18nContext();

  $effect(() => {
    if (!$query.isFetched) return;
    const pages = $query.data?.pages ?? [];
    const total = pages.reduce((n, p) => n + p.length, 0);
    // #region agent log
    fetch('http://127.0.0.1:7499/ingest/27c2d08d-4470-4015-abd2-33d1e0e3ecd8', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a0a46a' },
      body: JSON.stringify({
        sessionId: 'a0a46a',
        runId: 'pre-fix',
        hypothesisId: 'C-D',
        location: 'Feed.svelte',
        message: 'client local feed query',
        data: {
          isError: $query.isError,
          errorStatus: $query.error?.status ?? null,
          totalPosts: total,
          pageCount: pages.length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  });
</script>

<div class="relative">
  {#if pinnedPostId}
    <PinnedPost {pinnedPostId} />
  {/if}

  <InfiniteScrollContainer {query} uniqueBy={(post) => post.id}>
    {#snippet children({ list })}
      {#each list.filter((p: PublicPost) => !hasValue(pinnedPostId) || p.id !== pinnedPostId) as post (post.id)}
        <a href={`/posts/${post.repost ? post?.repost?.id : post.id}`}>
          <FeedPost {post} {inGroup} showReplyTo />
        </a>
      {/each}
    {/snippet}
    {#snippet empty()}
      <div
        class="flex h-96 w-full flex-col items-center justify-center gap-y-4"
      >
        <Rss class="text-surface-300 size-20" />
        <p class="text-xl">{t('posts.feed.empty')}</p>
      </div>
    {/snippet}
  </InfiniteScrollContainer>
</div>
