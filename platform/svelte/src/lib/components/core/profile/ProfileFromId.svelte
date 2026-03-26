<script lang="ts">
  import { ProfileCard } from '.';
  import { profileStore } from '$lib/api';
  import { Loader } from '@openpeeps/ui';
  import type { ComponentProps } from 'svelte';

  type Props = Omit<ComponentProps<typeof ProfileCard>, 'profile'> & {
    profileId: string;
  };

  let { profileId, ...props }: Props = $props();

  let profileQuery = profileStore(profileId);
</script>

<Loader queries={[$profileQuery]}>
  {#if $profileQuery.isSuccess}
    <ProfileCard profile={$profileQuery.data} {...props} />
  {/if}
</Loader>
