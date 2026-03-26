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

  interface Props {
    query: CreateInfiniteQueryResult<
      InfiniteData<PublicPost[], unknown>,
      SuccessFailureResponse
    >;
    inGroup?: boolean;
    pinnedPostId?: string;
  }

  let { query, inGroup = false, pinnedPostId }: Props = $props();
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
        <p class="text-xl">No posts yet.</p>
      </div>
    {/snippet}
  </InfiniteScrollContainer>
</div>
