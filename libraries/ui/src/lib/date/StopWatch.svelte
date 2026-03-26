<script lang="ts">
  import { onMount } from 'svelte';
  import { stopWatchFormatter } from './formatter';

  interface Props {
    start: string | Date | number;
    formatter?: (duration: number) => string;
  }

  let { start, formatter = stopWatchFormatter }: Props = $props();

  let formattedTimespan = $state(
    formatter(Date.now() - new Date(start).getTime()),
  );

  onMount(() => {
    setInterval(() => {
      formattedTimespan = formatter(Date.now() - new Date(start).getTime());
    }, 1000);
  });
</script>

{formattedTimespan}
