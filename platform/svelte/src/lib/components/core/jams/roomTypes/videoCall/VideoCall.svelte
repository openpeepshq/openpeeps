<script lang="ts">
  import {
    participantListStore,
    participantTracksStore,
  } from '$lib/components/core/jams/stores';
  import {
    getJamContext,
    getLivekitRoom,
    initChatContext,
    initNetworkContext,
    initDrawerContext,
    observerContext,
  } from '$lib/components/core/jams/context';
  import DesktopFooter from '$lib/components/core/jams/roomTypes/videoCall/DesktopFooter.svelte';
  import MobileFooter from '$lib/components/core/jams/roomTypes/videoCall/MobileFooter.svelte';
  import PeopleDrawer from '../../pieces/PeopleDrawer.svelte';
  import ChatDrawer from '../../pieces/ChatDrawer.svelte';
  import DebugDrawer from '../../pieces/DebugDrawer.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { sendAttendance } from '../../actions';
  import ScreenSharing from '$lib/components/core/jams/roomTypes/videoCall/modes/ScreenSharing.svelte';
  import OneOnOne from '$lib/components/core/jams/roomTypes/videoCall/modes/OneOnOne.svelte';
  import Alone from '$lib/components/core/jams/roomTypes/videoCall/modes/Alone.svelte';
  import Default from '$lib/components/core/jams/roomTypes/videoCall/modes/Default.svelte';
  import { addEventMutation } from '$lib/api';
  import { truncateText } from '@openpeeps/common/lib';
  import { derived, get } from 'svelte/store';
  import { Track } from 'livekit-client';
  import type { Participant } from 'livekit-client';
  import NetworkQuality from '../../pieces/NetworkQuality.svelte';
  import RecordingIndicator from '../../pieces/RecordingIndicator.svelte';
  import ObserverFooter from './ObserverFooter.svelte';

  const room = getLivekitRoom();
  const { jamEvent } = getJamContext();

  const participantList = participantListStore(room);

  export const participantScreenShareList = derived<
    typeof participantList,
    Participant[]
  >(
    participantList,
    ($participants, set) => {
      const unsubscribers: (() => void)[] = [];

      function update() {
        const screenSharers = $participants.filter((participant) => {
          const tracks = get(participantTracksStore(participant));
          return tracks.some(
            (track) =>
              track.kind === Track.Kind.Video &&
              track.source === Track.Source.ScreenShare &&
              !track.isMuted,
          );
        });
        set(screenSharers);
      }

      for (const participant of $participants) {
        const unsub = participantTracksStore(participant).subscribe(() => {
          update();
        });
        unsubscribers.push(unsub);
      }

      update();

      return () => {
        unsubscribers.forEach((unsub) => unsub());
      };
    },
    [],
  );

  const addEvent = addEventMutation();

  const drawer = initDrawerContext();
  initNetworkContext();
  initChatContext();

  const isObserver = observerContext();

  onMount(() => {
    if (!isObserver) {
      sendAttendance(room, 'join', addEvent);
    }
  });

  onDestroy(() => {
    if (!isObserver) {
      sendAttendance(room, 'leave', addEvent);
    }
  });
</script>

<div
  class="bg-surface-50 relative flex h-screen w-screen flex-col overflow-hidden"
>
  <NetworkQuality />
  <RecordingIndicator />
  <div class="relative flex w-full flex-1 overflow-hidden p-2">
    <div class="h-full w-full">
      <div class="flex items-center md:hidden">
        <h1 class="font-semibold" title={jamEvent.name}>
          {truncateText(jamEvent.name, 40)}
        </h1>
      </div>
      {#if $participantScreenShareList.length > 0}
        <ScreenSharing />
      {:else if isObserver}
        <Default />
      {:else if $participantList.length === 1}
        <Alone />
      {:else if $participantList.length === 2}
        <OneOnOne />
      {:else}
        <Default />
      {/if}
    </div>
    <div class="max-h-full overflow-y-auto md:flex-shrink-0">
      {#if $drawer === 'chat'}
        <ChatDrawer />
      {:else if $drawer === 'people'}
        <PeopleDrawer />
      {:else if $drawer === 'debug'}
        <DebugDrawer />
      {/if}
    </div>
  </div>
  <div class="bg-surface-50 h-16 w-full flex-shrink-0 md:h-20 md:p-2">
    {#if !isObserver}
      <DesktopFooter />
      <MobileFooter />
    {:else}
      <ObserverFooter />
    {/if}
  </div>
</div>
