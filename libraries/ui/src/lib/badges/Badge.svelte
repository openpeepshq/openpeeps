<script lang="ts">
  import type { Variant } from '$lib/types';

  interface Props {
    status: string;
    variant?: Variant;
  }

  let { status, variant = 'variant-filled-primary' }: Props = $props();
</script>

<span class="badge {variant}">
  {status}
</span>
