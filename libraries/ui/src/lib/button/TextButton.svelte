<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import Button from './Button.svelte';

  type Props = ComponentProps<typeof Button> & {
    text: string;
  };
  let { text, ...props }: Props = $props();
</script>

<Button {...props}>{text}</Button>
