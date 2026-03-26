<script lang="ts">
  import type { PublicPost } from '@openpeeps/common/types';
  import { buildThreads } from '@openpeeps/common/lib';
  import { getPostContext } from '$lib/api';
  import { FeedPost, ThreadedFeed } from '../../feed';
  import { onMount } from 'svelte';
  import { scrollToElement } from '$lib/utils';
  import ReplyBox from '../../ReplyBox.svelte';
  import { AccessDeniedLoader } from '$lib/components/layout';

  interface Props {
    post: PublicPost;
  }

  let { post }: Props = $props();

  let postContextQuery = getPostContext(post.id);

  let postContext = $derived($postContextQuery.data);
  let ancestryThread = $derived(
    postContext && buildThreads(postContext.ancestors)[0],
  );
  let descendentThreads = $derived(
    (postContext && buildThreads(postContext.descendants)) || [],
  );

  const deleteCallback = () => window.history.back();

  let postElement: HTMLElement | undefined = $state();

  onMount(() => postElement && scrollToElement(postElement));
</script>

<AccessDeniedLoader queries={[$postContextQuery]}>
  {#if ancestryThread}
    <ThreadedFeed thread={ancestryThread} />
  {/if}
  {#if post}
    <div bind:this={postElement}>
      <FeedPost {post} {deleteCallback} noReactionHeader={true} />
    </div>
  {/if}
  <ReplyBox {post} />
  {#each descendentThreads as thread (thread.id)}
    <ThreadedFeed {thread} />
  {/each}
  <div class="h-[70vh]"></div>
</AccessDeniedLoader>
