<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  type Props = HTMLInputAttributes & {
    error?: boolean;
  };
  let {
    error,
    value = $bindable(),
    checked = $bindable(),
    type,
    class: additionalClasses = '',
    ...rest
  }: Props = $props();
</script>

{#if type === 'checkbox'}
  <input
    type="checkbox"
    class="{error ? 'input-error' : 'input'} border-surface-300 w-4 rounded"
    bind:checked
    {...rest}
  />
{:else}
  <input
    {type}
    class="{error
      ? 'input-error'
      : 'input'} border-surface-300 w-full rounded {additionalClasses}"
    bind:value
    {...rest}
  />
{/if}
