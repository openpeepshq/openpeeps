<script lang="ts">
  import { checkRoleCapabilities, type ProfileWithMeta } from '@openpeeps/common';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const currentProfile: ProfileWithMeta = getCurrentProfile();

  const canCreateGroup = checkRoleCapabilities(
    ['core-groups-create'],
    currentProfile?.roles,
  );

  if (!canCreateGroup) {
    history.back();
  }
</script>

{#if canCreateGroup}
  {@render children?.()}
{:else}
  <p class="text-center">You do not have permission to create a group.</p>
{/if}
