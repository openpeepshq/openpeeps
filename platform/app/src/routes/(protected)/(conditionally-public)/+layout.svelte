<script lang="ts">
  import { RootLayout, ProfileGuard } from '@openpeeps/svelte/components';
  import { getServerInfo } from '@openpeeps/svelte/server';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const { publicContent } = getServerInfo();
</script>

<ProfileGuard isPubliclyAccessible={publicContent}>
  <RootLayout>
    {@render children?.()}
  </RootLayout>
</ProfileGuard>
