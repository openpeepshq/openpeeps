<script lang="ts">
  import { type Snippet } from 'svelte';
  import { setTheme, theme } from '@openpeeps/ui';
  import { getServerInfo } from '$lib/server';
  import { getCurrentProfileSettings } from '$lib/auth';
  import { getTheme } from '@openpeeps/common';

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();

  const serverInfo = getServerInfo();
  const profileSettings = getCurrentProfileSettings();

  const userTheme = getTheme(serverInfo.communityConfig, profileSettings);
  const base = userTheme.dark ? 'OpenpeepsDark' : 'OpenpeepsLight';

  setTheme(base);
</script>

<svelte:head>
  <meta
    name="theme-color"
    content={serverInfo.communityConfig?.theme.primaryHex || '#000000'}
  />
  {@html theme(base, userTheme.primaryHex, userTheme.background ?? '')}
</svelte:head>

{@render children?.()}
