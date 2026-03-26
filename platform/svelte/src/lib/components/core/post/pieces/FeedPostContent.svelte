<script lang="ts">
  import type { PublicPost } from '@openpeeps/common/types';
  import FeedPoll from '../types/poll/FeedPoll.svelte';
  import FeedNote from '../types/note/FeedNote.svelte';
  import FeedEvent from '../types/event/FeedEvent.svelte';
  import FeedArticle from '../types/article/FeedArticle.svelte';

  interface Props {
    post: PublicPost;
  }

  let { post }: Props = $props();
</script>

{#if post.deletedAt}
  <div class="text-sm text-gray-500">This post has been deleted.</div>
{:else if post.type === 'note'}
  <FeedNote {post} />
{:else if post.type === 'question'}
  <FeedPoll {post} />
{:else if post.type === 'event'}
  <FeedEvent {post} />
{:else if post.type === 'article'}
  <FeedArticle {post} />
{/if}
