<script lang="ts">
  import type { PublicProfile } from '@openpeeps/common/types';
  import FollowUnfollowButton from './FollowUnfollowButton.svelte';
  import { Avatar } from '.';
  import { profileName } from '@openpeeps/common/lib';

  interface Props {
    profile: PublicProfile;
    avatarSize?: number;
  }

  let { profile, avatarSize = 1.5 }: Props = $props();
</script>

<span class="badge variant-ringed-secondary">
  <div class="flex items-center gap-x-2">
    <Avatar {profile} borderless size={avatarSize} />
    <h3 class={avatarSize < 2 ? 'text-xs' : 'text-sm'}>
      {profileName(profile)}
    </h3>
  </div>
</span>
