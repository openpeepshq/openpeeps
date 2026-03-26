<script lang="ts">
  import { getJamContext } from '$lib/components/core/jams/context';
  import LeaveCloseButton from '$lib/components/core/jams/pieces/LeaveCloseButton.svelte';

  const { jamEvent } = getJamContext();
</script>

<div
  class="hidden w-full flex-none items-center justify-between px-4 py-3 md:flex"
>
  <div class="flex items-center">
    <h1>{jamEvent.name}</h1>
  </div>
</div>