<script module lang="ts">
  import { a, h1, h2, h3, h4, p, section } from '@openpeeps/svelte/components';
  import { AppBar, AppShell } from '@skeletonlabs/skeleton';
  import type { ServerInfo } from '@openpeeps/common/types';
  import { getTheme } from '@openpeeps/common';

  export { h1, h2, h3, h4, a, p, section };

  export let data: ServerInfo;
</script>

<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<AppShell slotPageContent="rounded-md my-2 mr-0 md:mx-4 md:mt-3 bg-surface-50">
  {#snippet header()}
    <AppBar>
      {#snippet lead()}
        {#if data}
          <a href="/">
            <img
              src={getTheme(data.communityConfig).logoSmall}
              alt="logo"
              class="h-5"
            />
          </a>
        {:else}
          <a href="/">&lt; Back to Community</a>
        {/if}
        <span style="width:20px"> </span>| <span style="width:20px"> </span>
        <a href="/docs">Documentation Home</a>
        <span style="width:20px"> </span>| <span style="width:20px"> </span>
        <a href="/docs/user">Using AllPeep</a>
        <span style="width:20px"> </span>| <span style="width:20px"> </span>
        <a href="/docs/admin">Administration</a>
        <span style="width:20px"> </span>| <span style="width:20px"> </span>
        <a href="/docs/development">Developers</a>
      {/snippet}
    </AppBar>
  {/snippet}

  <div class="allpeep-markdown prose px-10">
    {@render children?.()}
  </div>
</AppShell>
