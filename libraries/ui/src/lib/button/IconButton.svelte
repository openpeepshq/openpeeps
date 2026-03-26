<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import Button from './Button.svelte';
  import type { IconType } from '$lib/types';

  type Props = ComponentProps<typeof Button> & {
    icon: IconType;
  };
  let { icon: Icon, ...props }: Props = $props();
</script>

<Button {...props}>
  <Icon />
</Button>
