<script lang="ts">
  import {
    upcomingEventsFeedStore,
    pastEventsFeedStore,
  } from '@openpeeps/svelte/api';
  import { EventsPage } from '@openpeeps/svelte/components';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';
  import { getDefaultVisibility } from '@openpeeps/svelte/utils';
  import { NewEventButton } from '@openpeeps/svelte/components';

  const currentProfile = getCurrentProfile();
  const visibility = getDefaultVisibility();

  let upcomingQuery = upcomingEventsFeedStore(15);
  let pastQuery = pastEventsFeedStore(15);
</script>

<NewEventButton {visibility} {currentProfile} />
<EventsPage {upcomingQuery} {pastQuery} />
