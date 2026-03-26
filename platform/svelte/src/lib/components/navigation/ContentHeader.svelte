<script lang="ts">
  import { ChevronLeft } from 'lucide-svelte';
  import { getPageHeaderStore } from '$lib/stores';
  import { page } from '$app/state';
  import { capitalizeFirstLetter } from '@openpeeps/common/lib';
  import { i18nContext } from '$lib/components/i18n';

  const pageHeader = getPageHeaderStore();
  const { t } = i18nContext();

  const title = $derived(
    typeof $pageHeader?.title === 'string'
      ? $pageHeader.title
      : capitalizeFirstLetter(page.url.pathname.split('/').reverse()[0]),
  );
  const Title = $derived(
    $pageHeader?.title && typeof $pageHeader.title !== 'string'
      ? $pageHeader.title
      : undefined,
  );

  const Actions = $derived($pageHeader?.actions);
</script>

<div
  class="bg-surface-50 sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b p-4"
>
  <div class="flex items-center gap-2">
    <button title={t('navigation.back')} onclick={() => window.history.back()}>
      <ChevronLeft />
    </button>
    {#if Title}
      <Title />
    {:else}
      <h5 class="h5">{title}</h5>
    {/if}
  </div>
  {#if Actions}
    <div class="flex items-center gap-2">
      <Actions />
    </div>
  {/if}
</div>
