<script lang="ts">
  import { checkRoleCapabilities } from '@openpeeps/common';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const currentProfile = getCurrentProfile();

  const canCreateArticle = checkRoleCapabilities(
    ['core-posts-create-article-*'],
    currentProfile?.roles,
  );

  if (!canCreateArticle) {
    history.back();
  }
</script>

{#if canCreateArticle}
  {@render children?.()}
{:else}
  <p class="text-center">You do not have permission to create an event.</p>
{/if}
