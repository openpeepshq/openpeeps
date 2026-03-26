<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends HTMLTextareaAttributes {
    error?: boolean;
    ref?: HTMLTextAreaElement;
  }

  let {
    error = false,
    value = $bindable(''),
    ref = $bindable(),
    ...rest
  }: Props = $props();
</script>

<textarea
  class="{error ? 'input-error' : 'input'} w-full rounded border-surface-300"
  bind:this={ref}
  bind:value
  {...rest}
></textarea>
