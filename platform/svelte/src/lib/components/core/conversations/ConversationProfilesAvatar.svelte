<script lang="ts">
  import type { PublicProfile } from '@openpeeps/common';
  import { Avatar } from '../profile';
  import { getCurrentProfile } from '$lib/auth';

  interface Props {
    profiles?: PublicProfile[];
    avatarSize?: number;
  }

  let { profiles = [], avatarSize = 2.5 }: Props = $props();

  let gridColumn = $state(
    'grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);',
  );
  const me = getCurrentProfile();

  const divider = $derived<number>(() => {
    const count = profiles?.length ?? 0;

    if (count <= 1) return 1;
    if (count <= 4) {
      gridColumn =
        'grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr);';
      return 2;
    }
    if (count <= 9) {
      gridColumn =
        'grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);';
      return 3;
    }
    return 3;
  });
</script>

{#if profiles?.length! <= 2}
  <Avatar
    profile={profiles?.find((u) => u.id !== me.id)}
    borderless
    size={avatarSize}
  />
{:else}
  <div
    style={`width: ${avatarSize}rem; height: ${avatarSize}rem; min-width: ${avatarSize}rem !important;`}
    class="relative overflow-hidden rounded-full border"
  >
    <div class="grid" style="{gridColumn} width: 100%; height: 100%;">
      {#each profiles.slice(0, 9) as p}
        <Avatar profile={p} borderless size={avatarSize / divider} />
      {/each}
    </div>
  </div>
{/if}
