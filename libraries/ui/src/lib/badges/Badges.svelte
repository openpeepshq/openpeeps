<script lang="ts">
  import type { Variant } from '$lib/types';
  import Badge from './Badge.svelte';

  interface Props {
    data: { status: string; variant?: Variant }[];
  }

  let { data }: Props = $props();
</script>

<div class="flex flex-wrap">
  {#each data as { status, variant }}
    <Badge {status} {variant} />
  {/each}
</div>
