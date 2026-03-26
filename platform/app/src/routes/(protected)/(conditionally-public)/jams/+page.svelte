<script lang="ts">
  import { requireAccount } from '@openpeeps/svelte/utils';
  import { ChevronDown, ChevronRight, PhoneOff } from 'lucide-svelte';
  import {
    liveJamsListStore,
    upcomingJamsFeedStore,
    pastJamsFeedStore,
  } from '@openpeeps/svelte/api';
  import {
    JamsHeaderActions,
    CardEvent,
    EventsPage,
    AccessDeniedLoader,
    NewJamButton,
  } from '@openpeeps/svelte/components';
  import { setPageHeader } from '@openpeeps/svelte/stores';
  import { IconButton } from '@openpeeps/ui';
  import { i18nContext } from '@openpeeps/svelte/components';
  const { t } = i18nContext();
  import { getDefaultVisibility } from '@openpeeps/svelte/utils';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';

  const visibility = getDefaultVisibility();
  const currentProfile = getCurrentProfile();
  requireAccount();

  setPageHeader({
    title: t('navigation.jams'),
    actions: JamsHeaderActions,
  });

  const upcomingQuery = upcomingJamsFeedStore(15);
  const pastQuery = pastJamsFeedStore(15);

  const jamListQuery = liveJamsListStore();

  let showLiveJams = $state(true);

  const toggleLiveJams = () => {
    showLiveJams = !showLiveJams;
  };
</script>

<NewJamButton {visibility} {currentProfile} />
<div class="relative min-h-screen">
  <div class="flex items-center justify-start gap-x-4 px-4">
    <IconButton
      icon={showLiveJams ? ChevronDown : ChevronRight}
      action={toggleLiveJams}
    />
    <h2 class="text-lg font-semibold">{t('jams.liveJams')}</h2>
  </div>
  {#if showLiveJams}
    <AccessDeniedLoader queries={[$jamListQuery]}>
      <div class="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-8">
        {#each $jamListQuery.data || [] as jam (jam.id)}
          <CardEvent post={jam} />
        {/each}
      </div>
      {#if !$jamListQuery.data?.length}
        <div
          class="flex h-72 w-full flex-col items-center justify-center gap-y-6"
        >
          <PhoneOff size={60} />
          <p>{t('jams.noLiveJams')}</p>
        </div>
      {/if}
    </AccessDeniedLoader>
  {/if}
  <EventsPage {upcomingQuery} {pastQuery} type="jam" />
</div>
