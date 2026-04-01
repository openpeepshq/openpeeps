<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { trackPage } from './lib';
  import type { Tracker, Window } from './types';
  import { afterNavigate } from '$app/navigation';

  interface Props {
    url: string;
    siteId: number;
    disableCookies?: boolean;
    requireConsent?: boolean;
    doNotTrack?: boolean;
    enableCrossDomainLinking?: boolean;
    domains?: string[];
    heartBeat?: number;
    linkTracking?: boolean;
  }

  let {
    url,
    siteId,
    disableCookies = false,
    requireConsent = false,
    doNotTrack = false,
    enableCrossDomainLinking = false,
    domains = [],
    heartBeat = 15,
    linkTracking,
  }: Props = $props();

  let tracker: Tracker | undefined = $state(undefined);

  const init = () => {
    if (!('Matomo' in window)) {
      return;
    }
    const matomo = (window as Window).Matomo;

    tracker = matomo.getTracker(`${url}/matomo.php`, siteId);
    if (!tracker) return;
    if (disableCookies) {
      tracker.disableCookies();
    }
    if (requireConsent) {
      tracker.requireConsent();
    }
    tracker.setDoNotTrack(!!doNotTrack);
    if (enableCrossDomainLinking) {
      tracker.enableCrossDomainLinking();
    }
    if (domains.length > 0) {
      tracker.setDomains(domains);
    }
    if (heartBeat) {
      tracker.enableHeartBeatTimer(heartBeat);
    }
    tracker.enableLinkTracking(!!linkTracking);

    trackPage(tracker, page.url.href);
  };

  onMount(() => setTimeout(init, 200));
  afterNavigate(({ to }) => {
    if (!tracker) {
      init();
    }
    if (tracker && to?.url.href) {
      trackPage(tracker, to.url.href);
    }
  });
</script>

<svelte:head>
  {#if url}
    <script async defer src={`${url}/matomo.js`}></script>
  {/if}
</svelte:head>
