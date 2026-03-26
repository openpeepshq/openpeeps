<script lang="ts">
  import { onMount, setContext, type Snippet } from 'svelte';
  import { page } from '$app/state';
  import * as Sentry from '@sentry/sveltekit';
  import type { ServerDataContext } from './types';
  import type { CapabilitiesConfig, ServerInfo } from '@openpeeps/common/types';
  import { setTheme } from '@openpeeps/ui';

  let {
    capabilities,
    serverInfo,
    children,
  }: {
    capabilities: CapabilitiesConfig;
    serverInfo: ServerInfo;
    children: Snippet;
  } = $props();

  setContext<ServerDataContext>('allpeep-server-data', {
    capabilities,
    serverInfo,
  });

  if (!Sentry.isInitialized()) {
    Sentry.init({
      enabled: serverInfo.sentryConfig.enabled,
      dsn: serverInfo.sentryConfig.dsn,
      environment: serverInfo.environment,
      release: serverInfo.version,
      serverName: page.url.hostname,
      integrations: serverInfo.sentryConfig.replayEnabled
        ? [Sentry.replayIntegration()]
        : undefined,
      tracesSampleRate: 1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1,
    });
  }

  onMount(() => {
    setTheme(serverInfo.communityConfig?.theme.base);
  });
</script>

{@render children?.()}
