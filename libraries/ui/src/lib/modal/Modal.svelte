<script lang="ts">
  import { getModalStore } from '@skeletonlabs/skeleton';

  const modalStore = getModalStore();
</script>

{#if $modalStore[0]}
  {@const SvelteComponent = $modalStore[0]?.meta.component}
  <SvelteComponent
    {...$modalStore[0]?.meta.properties ?? {}}
    on:close={() => modalStore.close()}
  />
{/if}
