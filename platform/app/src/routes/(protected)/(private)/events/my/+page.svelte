<script lang="ts">
  import {
    myPastEventsFeedStore,
    myUpcomingEventsFeedStore,
  } from '@openpeeps/svelte/api';
  import { EventsPage } from '@openpeeps/svelte/components';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components';
  const { t } = i18nContext();

  let upcomingQuery = myUpcomingEventsFeedStore(15);
  let pastQuery = myPastEventsFeedStore(15);

  getPageHeaderStore().set({ title: t('navigation.myEvents') });
</script>

<div class="min-h-screen pb-4 bg-surface-50">
  <EventsPage {upcomingQuery} {pastQuery} />
</div>
