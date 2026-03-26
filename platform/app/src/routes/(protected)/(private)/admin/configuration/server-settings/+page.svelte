<script lang="ts">
  import { ConfigServerSettings } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';

  const pageHeaderStore = getPageHeaderStore();

  pageHeaderStore.set({
    title: 'Server Settings',
  });
</script>

<div class="p-4">
  <ConfigServerSettings />
</div>
