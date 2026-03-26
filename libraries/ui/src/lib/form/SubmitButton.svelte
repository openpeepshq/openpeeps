<script lang="ts" module>
  import type { ZodRawShape } from 'zod';

  type T = ZodRawShape;
</script>

<script lang="ts" generics="T extends ZodRawShape">
  import { Button } from '$lib';
  import { getFormContext } from '$lib';
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    action: () => unknown | Promise<unknown>;
    children?: Snippet;
    disable?: boolean;
  }

  let { title, action, children, disable = true }: Props = $props();

  const { messagesStore, validate } = getFormContext<T>();

  validate();
  let valid = $state(Object.keys($messagesStore).length === 0);

  messagesStore.subscribe((data) => {
    valid = Object.keys(data).length === 0;
  });
</script>

<Button
  {title}
  {action}
  variant="variant-filled-primary"
  class="w-full"
  disabled={disable ? !valid : false}
>
  {@render children?.()}
</Button>
