<script lang="ts">
  import { truncateText, type PublicProfile } from '@openpeeps/common';
  import { getCurrentProfile } from '$lib/auth';

  interface Props {
    profiles?: PublicProfile[];
  }

  let { profiles = [] }: Props = $props();

  const me = getCurrentProfile();

  let title = $state('');

  $effect(() => {
    if (!profiles || profiles.length === 0) title = '';

    const others = profiles.filter((p) => p.id !== me.id);

    const names = others.map((p) => p.displayName || `@${p.handle}`);

    if (names.length === 0) {
      title = 'You';
    } else {
      title = `${names.join(', ')} and You`;
    }
  });
</script>

<span class="truncate font-bold">{truncateText(title, 20)}</span>
