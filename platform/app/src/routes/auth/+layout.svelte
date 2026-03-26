<script lang="ts">
  import { AuthLayout } from '@openpeeps/svelte/components';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<AuthLayout>
  {@render children?.()}
</AuthLayout>
