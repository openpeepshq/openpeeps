<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    measurementId: string;
  }

  let { measurementId }: Props = $props();

  const init = () => {
    if ('dataLayer' in window) {
      (window.dataLayer as Array<unknown>).push(['js', new Date()]);
      (window.dataLayer as Array<unknown>).push(['config', measurementId]);
    }
  };

  onMount(() => setTimeout(init, 200));
</script>

<svelte:head>
  <script
    async
    defer
    src="https://www.googletagmanager.com/gtag/js?id={measurementId}"
  >
  </script>
</svelte:head>
