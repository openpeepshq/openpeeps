<script lang="ts">
  import OpenpeepsMarkdownInput from './OpenpeepsMarkdownInput.svelte';
  import { getFormContext, deepSet, deepGet, Label } from '@openpeeps/ui';
  import type { ComponentProps } from 'svelte';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
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
  title={t('common.form.description')}
  messages={dirty ? $messagesStore['data.content'] : []}
>
  <OpenpeepsMarkdownInput oninput={updateAndValidate} {value} {...props} />
</Label>
