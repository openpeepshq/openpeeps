<script lang="ts">
  import type { PublicPost, Thread } from '@openpeeps/common/types';
  import { dateSorter } from '@openpeeps/common/lib';
  import ThreadPost from '$lib/components/core/post/feed/threaded/ThreadPost.svelte';
  import { Button } from '@openpeeps/ui';

  const lastLongestPathSelector = (
    thread: Thread,
  ): Thread & { depth: number } => {
    const candidates = thread.children.map((t) => lastLongestPathSelector(t));

    const maxDepth = Math.max(0, ...candidates.map((c) => c.depth));

    const selectedChild = candidates
      .filter((c) => c.depth === maxDepth)
      .sort(dateSorter())
      .reverse()[0];

    return {
      ...thread,
      children: selectedChild ? [selectedChild] : [],
      depth: maxDepth + 1,
    };
  };

  const collectPath = (
    thread: Thread,
    currentPath: PublicPost[] = [],
  ): PublicPost[] => {
    if (thread) {
      return [...currentPath, thread, ...collectPath(thread.children[0])];
    } else {
      return currentPath;
    }
  };

  interface Props {
    thread: Thread;
    pathSelector?: (thread: Thread) => Thread;
  }

  let { thread, pathSelector = lastLongestPathSelector }: Props = $props();

  let postList: PublicPost[] = $derived(collectPath(pathSelector(thread)));
</script>

<div>
  {#each postList as post, index (post.id)}
    <Button action="/posts/{post.id}">
      <ThreadPost
        {post}
        isChild={index > 0}
        isParent={index < postList.length - 1}
      />
    </Button>
  {/each}
</div>
