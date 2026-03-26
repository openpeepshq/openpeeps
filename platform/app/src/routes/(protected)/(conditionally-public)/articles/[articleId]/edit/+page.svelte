<script lang="ts">
  import { getPostStore } from '@openpeeps/svelte/api';
  import { page } from '$app/state';
  import EditArticlePage from './EditArticlePage.svelte';
  import { AccessDeniedLoader } from '@openpeeps/svelte/components';
  import type { PostWithMeta } from '@openpeeps/common';

  const articleId = page.params.articleId;
  const postQuery = getPostStore(articleId);
</script>

<div class="pb-12">
  <AccessDeniedLoader queries={[$postQuery]}>
    {#if $postQuery.data}
      <EditArticlePage post={$postQuery.data as PostWithMeta} />
    {/if}
  </AccessDeniedLoader>
</div>
