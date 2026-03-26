<script lang="ts">
  import {
    myUpcomingJamsFeedStore,
    myPastJamsFeedStore,
  } from '@openpeeps/svelte/api';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { EventsPage, JamsHeaderActions } from '@openpeeps/svelte/components';
  import { i18nContext } from '@openpeeps/svelte/components';
  const { t } = i18nContext();

  getPageHeaderStore().set({
    title: t('navigation.myJams'),
    actions: JamsHeaderActions,
  });

  let upcomingQuery = myUpcomingJamsFeedStore(15);
  let pastQuery = myPastJamsFeedStore(15);
</script>

<div class="min-h-screen pb-4 bg-surface-50">
  <EventsPage {upcomingQuery} {pastQuery} type="jam" />
</div>
