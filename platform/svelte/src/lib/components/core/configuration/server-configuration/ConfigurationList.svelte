<script lang="ts">
  // @ts-nocheck
  import { z, ZodArray, type ZodTypeAny } from 'zod';
  import { ConfigurationCategory, ConfigurationValueEditor } from '..';
  import { Minus, Plus } from 'lucide-svelte';
  import { unwrap } from '$lib/components/core/configuration/helpers';
  import equal from 'fast-deep-equal';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();

  type Shape = z.infer<typeof elementSchema>;

  interface Props {
    schema: ZodArray<ZodTypeAny>;
    config: Shape[];
    path?: (string | number)[];
    value?: Shape[];
    disabled?: boolean;
  }

  let {
    schema,
    config,
    path = [],
    value = $bindable([...config]),
    disabled = schema.description === 'fixed',
  }: Props = $props();

  // zod v4: the array element is exposed via `.element` (`_def.type` is now the
  // string type discriminator, not the element schema).
  let elementSchema = schema.element;
  let unwrappedElementSchema = unwrap(elementSchema);
  let defaults = elementSchema.parse(undefined);

  let dirty = $derived(!equal(value, config));

  const addElement = () => {
    value = [...value, structuredClone(defaults)];
  };

  const removeElement = (index: number) => {
    value = value.toSpliced(index, 1);
  };
</script>

<div class="mt-4 pl-4">
  <p class:font-bold={dirty}>
    {path.slice(-1)[0] || t('admin.configuration.unnamedSection')}
  </p>
  {#each value as _, index (index)}
    {#if unwrappedElementSchema instanceof z.ZodObject}
      <ConfigurationCategory
        bind:value={value[index]}
        schema={unwrappedElementSchema}
        path={[...path, String(index)]}
        config={config?.[index] || defaults}
        {defaults}
        {disabled}
      ></ConfigurationCategory>
    {:else}
      <ConfigurationValueEditor
        bind:value={value[index]}
        schema={unwrappedElementSchema}
        path={[...path, String(index)]}
        config={config?.[index] || defaults}
        {defaults}
        {disabled}
      ></ConfigurationValueEditor>
    {/if}
    <button title={t('common.listEditor.removeTitle')} onclick={() => removeElement(index)}
      ><Minus /></button
    >
  {/each}
  <button title={t('common.listEditor.addTitle')} onclick={addElement}><Plus /></button>
</div>
