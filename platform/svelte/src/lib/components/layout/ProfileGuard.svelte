<script lang="ts">
  import { goto } from '$app/navigation';
  import { checkRoleCapabilities } from '@openpeeps/common/lib';
  import { getCurrentProfile } from '$lib/auth';

  interface Props {
    neededCapabilities?: string[];
    isPubliclyAccessible?: boolean;
    children?: import('svelte').Snippet;
  }

  let {
    neededCapabilities = [],
    isPubliclyAccessible = false,
    children,
  }: Props = $props();

  const currentProfile = getCurrentProfile();

  let authCheckResult = $state({
    missingCapabilities: neededCapabilities,
    success: !neededCapabilities.length,
  });

  if (currentProfile?.type === 'local' || isPubliclyAccessible) {
    authCheckResult = checkRoleCapabilities(
      currentProfile?.roles || [],
      neededCapabilities,
    );
  } else {
    const url = window.location.pathname;
    goto('/auth/login?redirect=' + url);
  }
</script>

{#if authCheckResult.success}
  {@render children?.()}
{/if}
