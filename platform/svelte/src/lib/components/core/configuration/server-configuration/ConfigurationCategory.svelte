<script lang="ts">
  import { z, ZodObject, type ZodRawShape } from 'zod';
  import {
    ConfigurationList,
    ConfigurationValueEditor,
    ConfigurationCategory,
  } from '..';
  import {
    diffConfigTrees,
    equal,
    unwrap,
  } from '$lib/components/core/configuration/helpers';
  import { i18nContext } from '$lib/components/i18n';
  import { ExpandableBox } from '@openpeeps/ui';
  import { capitalizeFirstLetter } from '@openpeeps/common';

  const { t } = i18nContext();

  type Shape = z.infer<typeof schema>;
  type Key = keyof Shape;
  type Value = Shape[keyof Shape];

  const fieldInfo = (entry: [Key, Value]) => {
    const key = entry[0];
    const def = entry[1];
    return { key, def, path: [...path, key] };
  };

  interface Props {
    schema: ZodObject<ZodRawShape>;
    config: Shape;
    defaults: Shape;
    path?: (string | number)[];
    value?: Shape;
    disabled?: boolean;
    collapsible?: boolean;
  }

  let {
    schema,
    config,
    defaults,
    path = [],
    value = $bindable(),
    collapsible = true,
    disabled = schema.description === 'fixed' ? true : undefined,
  }: Props = $props();

  value = structuredClone(config);

  let dirty = $derived(!equal(config, value));
  let dirtyProps = $derived(
    Object.entries(diffConfigTrees(config, value)).map(fieldInfo),
  );
  let dirtyPaths = $derived(dirtyProps.map((p) => p.path).flat());

  const pathName = path.slice(-1)[0];
  let dirtyField = $derived(
    dirtyPaths?.find((p) => p === pathName) !== undefined,
  );

  const fields = Object.entries(schema.shape).map(fieldInfo);

  const hasKey = (v: string | number) => dirtyPaths.includes(v?.toString());
</script>

{#if fields.length > 0}
  <div class={collapsible ? 'mt-4 pl-4' : ''}>
    {#if collapsible}
      <p class:font-bold={dirty}>
        {pathName || t('configuration.title')}
      </p>
    {/if}
    {#each fields as field}
      {@const fieldSchema = unwrap(field.def)}
      {#if fieldSchema.description !== 'fixed' && fieldSchema.description !== 'hidden'}
        {#if fieldSchema instanceof z.ZodObject}
          <ExpandableBox initialOpen={false}>
            {#snippet title()}
              <p
                class:font-bold={!collapsible
                  ? dirtyField && hasKey(field.key)
                  : dirty && hasKey(field.key)}
              >
                {capitalizeFirstLetter(field.key?.toString())}
              </p>
            {/snippet}
            <ConfigurationCategory
              bind:value={value[field.key]}
              schema={fieldSchema}
              path={field.path}
              config={config[field.key]}
              defaults={defaults[field.key]}
              collapsible={false}
              {disabled}
            ></ConfigurationCategory>
          </ExpandableBox>
        {:else if fieldSchema instanceof z.ZodArray}
          <ConfigurationList
            bind:value={value[field.key]}
            schema={fieldSchema}
            path={field.path}
            config={config[field.key]}
            {disabled}
          ></ConfigurationList>
        {:else}
          <ConfigurationValueEditor
            bind:value={value[field.key]}
            schema={field.def}
            path={field.path.map(String)}
            config={config[field.key]}
            defaults={defaults[field.key]}
            {disabled}
          ></ConfigurationValueEditor>
        {/if}
      {/if}
    {/each}
  </div>
{/if}
