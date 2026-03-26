<script lang="ts">
  import { RootLayout, ProfileGuard } from '@openpeeps/svelte/components';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<ProfileGuard>
  <RootLayout>
    {@render children?.()}
  </RootLayout>
</ProfileGuard>
