<script lang="ts">
  import { getPostStore, groupStore } from '@openpeeps/svelte/api';
  import { page } from '$app/state';
  import {
    AccessDeniedLoader,
    FullEvent,
    FullNote,
    FullArticle,
    FullPoll,
  } from '@openpeeps/svelte/components';
  import type { GroupWithMeta, PostWithMeta } from '@openpeeps/common/types';
  import type { CreateQueryResult } from '@tanstack/svelte-query';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { presetProps } from '@openpeeps/svelte/utils';
  import PostPageHeaderTitle from './PostPageHeaderTitle.svelte';

  let postQuery: CreateQueryResult<PostWithMeta> = getPostStore(
    page.params.postId,
  );
  const post: PostWithMeta | undefined = $derived($postQuery.data);

  const groupQuery = $derived(groupStore(post?.groupId || ''));

  const group: GroupWithMeta | undefined = $derived($groupQuery.data);
  const postType = $derived(post?.type);
  const pageHeaderStore = getPageHeaderStore();

  $effect(() => {
    pageHeaderStore.set({
      title: presetProps(PostPageHeaderTitle, {
        postType,
        group,
      }),
    });
  });
</script>

<AccessDeniedLoader queries={[$postQuery]}>
  {#if post}
    {#if postType === 'event'}
      <FullEvent {post} />
    {:else if postType === 'article'}
      <FullArticle {post} />
    {:else if postType === 'question'}
      <FullPoll {post} />
    {:else}
      <FullNote {post} />
    {/if}
  {:else}
    <div class="flex h-full items-center justify-center">
      <p class="text-2xl font-bold">Post not found</p>
    </div>
  {/if}
</AccessDeniedLoader>
