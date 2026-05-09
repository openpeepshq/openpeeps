<script lang="ts">
  import type { PublicPost } from '@openpeeps/common/types';
  import PostReactionHeader from '$lib/components/core/post/pieces/PostReactionHeader.svelte';
  import PostInfoHeader from '$lib/components/core/post/pieces/PostInfoHeader.svelte';
  import FeedPostStats from '$lib/components/core/post/pieces/FullPostStats.svelte';
  import FeedPostActions from '$lib/components/core/post/pieces/PostActions.svelte';
  import FeedPostContent from '$lib/components/core/post/pieces/FeedPostContent.svelte';
  import ThreadPost from '../threaded/ThreadPost.svelte';
  import type { Snippet } from 'svelte';
  import { postViewCounter } from '$lib/utils';

  interface Props {
    post: PublicPost;
    deleteCallback?: () => void;
    noReactionHeader?: boolean;
    inGroup?: boolean;
    showReplyTo?: boolean;
    content?: Snippet;
  }

  let {
    post,
    deleteCallback = () => undefined,
    noReactionHeader = false,
    inGroup = false,
    showReplyTo = false,
    content = undefined,
  }: Props = $props();

  const hasReactionHeader =
    !noReactionHeader &&
    (!!post.repost || !!post.inReplyToId || (!!post.groupId && !inGroup));

  let displayedPost: PublicPost = $derived(post?.repost || post);
  let isUnseen = $derived(post.seen === false);
  let hasStats: boolean = $derived(
    !!(
      displayedPost?.repostCount ||
      displayedPost?.reactions.length ||
      displayedPost?.replyCount
    ),
  );
</script>

<div
  class="relative border-b p-4 {isUnseen
    ? 'border-l-primary-500 bg-primary-500/5 border-l-4'
    : ''}"
  use:postViewCounter={post.id}
>
  {#if isUnseen}
    <span
      class="bg-primary-500 absolute right-4 top-4 h-2.5 w-2.5 rounded-full"
      aria-label="Unseen post"
      title="Unseen post"
    ></span>
  {/if}
  {#if hasReactionHeader}
    <PostReactionHeader {post} {deleteCallback} {inGroup} />
  {/if}
  {#if displayedPost.replyTo && showReplyTo}
    <a href="/posts/{displayedPost.replyTo.id}">
      <ThreadPost
        post={displayedPost.replyTo as PublicPost}
        isParent
        noActions
        noMenu
      />
    </a>
  {/if}
  <div>
    <PostInfoHeader
      post={displayedPost}
      showMenu={!hasReactionHeader}
      {deleteCallback}
    />
    <div class="pb-2">
      {#if content}
        {@render content()}
      {:else}
        <FeedPostContent post={displayedPost} />
      {/if}
    </div>
    {#if hasStats}
      <FeedPostStats post={displayedPost} />
    {/if}
  </div>
  <FeedPostActions post={displayedPost} />
</div>
