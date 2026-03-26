<script lang="ts">
  import type { FormMessage } from './types';
  import { Info } from 'lucide-svelte';
  interface Props {
    title?: string;
    messages?: FormMessage[];
    classes?: string;
    description?: string;
    forCheckbox?: boolean;
    inline?: boolean;
    dirty?: boolean;
    children?: import('svelte').Snippet;
    required?: boolean;
    [key: string]: unknown;
  }

  let {
    title = '',
    messages = [],
    classes = '',
    description = '',
    forCheckbox = false,
    inline = false,
    dirty = false,
    children,
    required = false,
    ...rest
  }: Props = $props();

  const messageColor = (m: FormMessage) => {
    if (dirty) {
      switch (m.severity) {
        case 'error':
          return 'text-error-500';
        case 'warning':
          return 'text-warning-500';
        case 'info':
          return '';
      }
    } else {
      return '';
    }
  };
</script>

<label
  class="label flex {inline
    ? 'flex-row items-center gap-2'
    : 'flex-col'} {classes}"
  {...rest}
>
  {#if title}
    <span>
      {title}
      {#if required}
        <span class:text-error-500={dirty}>*</span>
      {/if}
    </span>
  {/if}
  <span
    class="flex {forCheckbox ? ' items-center gap-2' : 'flex-col'} flex-grow"
  >
    <span class="text-sm">
      {description}
    </span>
    {@render children?.()}
  </span>
  {#each messages || [] as m, index (index)}
    <span class="{messageColor(m)} flex items-center gap-2">
      <Info class="size-4" />
      {m.text}
    </span>
  {/each}
</label>
