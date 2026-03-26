<script lang="ts">
  import { EventsPage } from '$lib/components/core/post';
  import type {
    CreateInfiniteQueryResult,
    InfiniteData,
  } from '@tanstack/svelte-query';
  import type { PublicPost } from '@openpeeps/common/types';
  import { getCurrentProfile } from '$lib/auth';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { NewEventButton } from '$lib/components/navigation';

  const currentProfile = getCurrentProfile();

  interface Props {
    group: GroupWithMeta;
    upcomingQuery: CreateInfiniteQueryResult<
      InfiniteData<PublicPost[], unknown>
    >;
    pastQuery: CreateInfiniteQueryResult<InfiniteData<PublicPost[], unknown>>;
  }
  let { group, upcomingQuery, pastQuery }: Props = $props();
</script>

<NewEventButton visibility="group" {currentProfile} {group} />
<EventsPage {upcomingQuery} {pastQuery} />
