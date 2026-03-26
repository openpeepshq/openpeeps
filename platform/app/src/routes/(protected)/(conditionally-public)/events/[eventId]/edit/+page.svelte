<script lang="ts">
  import { getPostStore } from '@openpeeps/svelte/api';
  import { page } from '$app/state';
  import EditEventPage from './EditEventPage.svelte';
  import { AccessDeniedLoader } from '@openpeeps/svelte/components';

  const eventId = page.params.eventId;
  const postQuery = getPostStore(eventId);
</script>

<div class="pb-12">
  <AccessDeniedLoader queries={[$postQuery]}>
    {#if $postQuery.data}
      <EditEventPage post={$postQuery.data} />
    {/if}
  </AccessDeniedLoader>
</div>
