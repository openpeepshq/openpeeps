<script lang="ts">
  import OpenpeepsMarkdownInput from './OpenpeepsMarkdownInput.svelte';
  import { getFormContext, deepSet, deepGet, Label } from '@openpeeps/ui';
  import type { ComponentProps } from 'svelte';
  const { messagesStore, data, validate } = getFormContext();

  type Props = Omit<ComponentProps<typeof OpenpeepsMarkdownInput>, 'oninput'> & {
    path: (string | number)[];
  };

  let { path, ...props }: Props = $props();
  let dirty = $state(false);

  const updateAndValidate = (value: string) => {
    deepSet(data, path, value);
    validate();
    dirty = true;
  };

  let value = $derived(deepGet(data, path) as string | undefined);
</script>

<Label
  title="Description"
  messages={dirty ? $messagesStore['data.content'] : []}
>
  <OpenpeepsMarkdownInput oninput={updateAndValidate} {value} {...props} />
</Label>
