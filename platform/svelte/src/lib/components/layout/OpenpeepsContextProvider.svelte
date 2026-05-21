<script lang="ts">
  import {
    getPageHeaderStore,
    initializeNewPostStores,
    initializePageStores,
  } from '$lib/stores';
  import { onNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { jwtHasRemainingValidityAtLeast } from '@openpeeps/common';
  import { getCredentials } from '$lib/auth';
  import { refresh } from '$lib/api/auth';
  import { getServerInfo } from '$lib/server';
  import { onDestroy } from 'svelte';
  import { markPostsSeenMutation } from '$lib/api';
  import {
    createPostViewCounterContext,
    setPostViewCounterContext,
  } from '$lib/utils/postViewCounter';

  initializeNewPostStores();
  initializePageStores();

  const { children } = $props();

  const pageHeader = getPageHeaderStore();

  const serverInfo = getServerInfo();
  const markPostsSeen = markPostsSeenMutation();
  const postViewCounterContext = createPostViewCounterContext(async (postIds) => {
    await markPostsSeen({ postIds });
  });
  setPostViewCounterContext(postViewCounterContext);

  const refreshIfExpiringSoon = () => {
    const token = getCredentials().token;
    if (!token?.trim()) return;
    if (!jwtHasRemainingValidityAtLeast(token, 1)) return;
    if (jwtHasRemainingValidityAtLeast(token, 60 * 60)) return;
    void refresh().catch(() => {});
  };

  onNavigate(() => {
    pageHeader.set({});
  });

  onDestroy(() => {
    postViewCounterContext.destroy();
  });

  onMount(() => {
    refreshIfExpiringSoon();
    const id = window.setInterval(refreshIfExpiringSoon, 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshIfExpiringSoon();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  });
</script>

<svelte:head>
  <title>
    {serverInfo.communityConfig?.info.name}{$pageHeader
      ? `${typeof $pageHeader.title === 'string' ? ' - ' + $pageHeader.title : ''}`
      : ''}
  </title>
</svelte:head>
{@render children?.()}
