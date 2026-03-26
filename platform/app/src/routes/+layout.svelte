<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { browser } from '$app/environment';

  import { initializeStores, Modal, Toast } from '@skeletonlabs/skeleton';
  import './app.postcss';
  import { onMount } from 'svelte';
  import { logger } from '@openpeeps/svelte/log';
  import { goto } from '$app/navigation';
  import {
    ProfileProvider,
    I18nProvider,
    ServerDataProvider,
    OpenpeepsContextProvider,
    OpenpeepsThemeProvider,
  } from '@openpeeps/svelte/components';

  const log = logger('root');

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
      },
    },
  });

  initializeStores();

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  onMount(() => {
    if (navigator.serviceWorker?.controller) {
      const messageChannel = new MessageChannel();
      navigator.serviceWorker.controller.postMessage(
        {
          type: 'INVALIDATE_QUERIES_PORT',
        },
        [messageChannel.port2],
      );
      navigator.serviceWorker.controller?.postMessage({
        type: 'SKIP_WAITING',
      });
      messageChannel.port1.onmessage = (event) => {
        log.debug('Invalidating queries for keys: ', event.data);
        queryClient.invalidateQueries();
      };
      navigator.serviceWorker.addEventListener(
        'message',
        (event: MessageEvent) => {
          const data = (event?.data || {}) as { type?: string; url?: string };
          if (data?.type === 'NAVIGATE_TO' && typeof data.url === 'string') {
            goto(data.url);
          }
        },
      );

      navigator.serviceWorker.controller.postMessage({
        type: 'GET_PENDING_DEEPLINK',
      });
    }
  });
</script>

<ServerDataProvider>
  <I18nProvider>
    <QueryClientProvider client={queryClient}>
      <OpenpeepsContextProvider>
        <ProfileProvider>
          <OpenpeepsThemeProvider>
            <Modal />
            <Toast position="tr" />
            {@render children?.()}
          </OpenpeepsThemeProvider>
        </ProfileProvider>
      </OpenpeepsContextProvider>
    </QueryClientProvider>
  </I18nProvider>
</ServerDataProvider>
