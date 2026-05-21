<script lang="ts" module>
  type T = unknown;
</script>

<script lang="ts" generics="T">
import type { ZodType } from 'zod/v4';
  import { readonly, writable } from 'svelte/store';
  import { initFormContext, zodErrorToFormMessages } from '$lib';

  import type { FormMessage, FormMessages } from './types';
  import { preventDefault } from '$lib/utils';
  import { Info } from 'lucide-svelte';

  interface Props {
    data: T;
    schema?: ZodType<T> | undefined;
    valid?: boolean;
    onsubmit?: any;
    validator?: (data: T) => FormMessages;
    children?: import('svelte').Snippet;
    onchange?: (data: T) => void;
    onPreValidate?: (data: T) => void;
    class?: string;
  }

  let {
    data = $bindable(),
    schema = undefined,
    valid = $bindable(false),
    onsubmit = () => {},
    validator = (data) => {
      if (schema) {
        const result = schema.safeParse(data);
        return result.success ? {} : zodErrorToFormMessages(result.error);
      } else {
        return {};
      }
    },
    onchange = undefined,
    onPreValidate = undefined,
    children,
    class: additionalClasses = '',
  }: Props = $props();

  const messagesStore = writable<FormMessages>({});

  const validate = () => {
    onPreValidate?.(data);
    const messages = validator(data);
    messagesStore.set(messages);
    valid = Object.keys(messages).length === 0;
    onchange?.(data);
  };

  initFormContext<T>({
    schema,
    data,
    messagesStore: readonly(messagesStore),
    validate,
    valid,
  });

  $effect(() => {
    validate();
  });

  const messageColor = (m: FormMessage) => {
    switch (m.severity) {
      case 'error':
        return 'text-error';
      case 'warning':
        return 'text-warning';
      case 'info':
        return '';
    }
  };
</script>

<form
  onsubmit={preventDefault(onsubmit)}
  class="flex flex-col gap-4 {additionalClasses}"
>
  {#each $messagesStore['__form__'] || [] as m, index (index)}
    <span class={messageColor(m)}>
      <Info class="size-4" />
      {m.text}
    </span>
  {/each}
  {@render children?.()}
</form>
