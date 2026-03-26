<script lang="ts">
  import { ProfileGuard, ContentHeader } from '@openpeeps/svelte/components';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<ProfileGuard>
  <div class="w-screen h-screen bg-surface-50 overflow-y-auto">
    <div class="w-full sticky top-0 z-10 bg-surface-50">
      <ContentHeader />
    </div>
    {@render children?.()}
  </div>
</ProfileGuard>
