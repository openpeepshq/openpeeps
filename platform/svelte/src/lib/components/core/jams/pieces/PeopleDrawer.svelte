<script lang="ts">
  import { Search } from 'lucide-svelte';
  import {
    getLivekitRoom,
    getWaitingRoom,
  } from '$lib/components/core/jams/context';
  import { participantListStore } from '$lib/components/core/jams/stores';
  import JamParticipantCard from './JamParticipantCard.svelte';
  import type { Participant } from 'livekit-client';
  import type { MetadataType } from '$lib/types';
  import { matchesQuery } from '@openpeeps/common/lib';
  import Drawer from '$lib/components/core/jams/pieces/Drawer.svelte';
  import JamWaitingCard from '$lib/components/core/jams/pieces/JamWaitingCard.svelte';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
  const room = getLivekitRoom();
  const waitingRoomStore = getWaitingRoom();

  const participantList = participantListStore(room);

  let participantQuery = $state('');

  let listedParticipants: Participant[] = $derived(
    $participantList.filter((participant) => {
      const participantMetadata: MetadataType = JSON.parse(
        participant.metadata || '{}',
      );
      return (
        !participantMetadata.observer &&
        (!participantQuery ||
          matchesQuery(participantMetadata.profile, participantQuery))
      );
    }) ?? [],
  );
  let waitingParticipants = $derived(
    waitingRoomStore
      ? Object.values($waitingRoomStore || {}).filter((profile) =>
          matchesQuery(profile, participantQuery),
        )
      : [],
  );
</script>

<Drawer title={t('jams.drawer.peopleTitle')}>
  <div class="flex h-full flex-col">
    <div class="mx-2 flex items-center border border-neutral-300">
      <input
        bind:value={participantQuery}
        class="flex w-[95%] items-center gap-x-2 border-0 bg-transparent px-2 py-1 outline-none placeholder:text-neutral-300 focus:outline-none active:outline-none"
        placeholder={t('jams.drawer.searchPeoplePlaceholder')}
      />
      <button title={t('jams.drawer.searchButton')} class="ml-4 text-neutral-300">
        <Search />
      </button>
    </div>
    <div class="mb-5 mt-4 w-full border-b border-neutral-300"></div>
    <div class="flex-1 overflow-y-auto px-2">
      <h3>{t('jams.people.inJam')}</h3>
      <div class="mt-1 flex flex-col gap-y-2">
        {#each listedParticipants as participant (participant.identity)}
          <JamParticipantCard {participant} />
        {/each}
        {#if listedParticipants.length === 0}
          <p class="mt-4 text-center text-neutral-400">{t('jams.people.noParticipants')}</p>
        {/if}
      </div>

      {#if waitingRoomStore && waitingParticipants.length > 0}
        <h3 class="mt-4">{t('jams.people.inWaitingRoom')}</h3>
        <div class="mt-1 flex flex-col gap-y-2">
          {#each waitingParticipants as profile (profile.id)}
            <JamWaitingCard {profile} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</Drawer>
