<script lang="ts" module>
  import type { ZodRawShape } from 'zod';

  type T = ZodRawShape;
</script>

<script lang="ts" generics="T extends ZodRawShape">
  import {
    Label,
    Input,
    Textarea,
    isoDateToDatetimeLocal,
    datetimeLocalToIsoDate,
    getSchemaForPath,
  } from '.';
  import { getFormContext, deepSet, deepGet, pathToString } from '$lib';
  import type { FormEventHandler } from 'svelte/elements';
  import type { Snippet } from 'svelte';
  import type { OptionData } from './types';
  const { messagesStore, data, validate, schema } = getFormContext<T>();

  interface Props {
    type?: string;
    title?: string;
    description?: string;
    path: (number | string)[];
    placeholder?: string;
    dirty?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    options?: OptionData[];
    lead?: Snippet;
    tail?: Snippet;
    children?: Snippet;
    timezone?: string;
    elementToValue?: (
      e: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    ) => string | boolean;
    transformValue?: (value: unknown) => string;
    timeZone?: string;
    step?: number;
    oninput?: (e: Event) => void;
  }

  let {
    type = 'text',
    title = '',
    description = '',
    path,
    placeholder = title,
    dirty = $bindable(false),
    disabled = false,
    readonly = false,
    options = [],
    lead,
    tail,
    children,
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    elementToValue,
    transformValue,
    step = 1,
    oninput,
  }: Props = $props();
  elementToValue =
    elementToValue ??
    ((e: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) =>
      e instanceof HTMLInputElement && e.type === 'checkbox'
        ? e.checked
        : e instanceof HTMLInputElement && e.type === 'datetime-local'
          ? e.value
            ? datetimeLocalToIsoDate(e.value, timeZone)
            : ''
          : e.value);

  transformValue =
    (transformValue ?? type === 'datetime-local')
      ? (value: unknown) => {
          if (!value) return '';
          return isoDateToDatetimeLocal(String(value), timeZone);
        }
      : (value: unknown) => String(value ?? '');

  const updateAndValidate: FormEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > = (e) => {
    const newValue = elementToValue(e.currentTarget);
    deepSet(data, path, newValue);
    oninput?.(e);
    dirty = true;
    validate();
  };

  const schemaForPath = getSchemaForPath(schema, path);

  const value = $derived(transformValue(deepGet(data, path)));
  const checked = Boolean(deepGet(data, path));
</script>

<Label
  {title}
  {description}
  messages={$messagesStore[pathToString(path)]}
  {dirty}
  required={!schemaForPath?.isOptional()}
  forCheckbox={type === 'checkbox'}
>
  {@const cols = lead ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[1fr_auto]'}
  {#if type === 'textarea'}
    <Textarea
      {disabled}
      {value}
      oninput={updateAndValidate}
      {placeholder}
      {readonly}
    />
  {:else if type === 'checkbox'}
    <Input {disabled} {type} {checked} oninput={updateAndValidate} />
  {:else if type === 'select'}
    <select
      {disabled}
      {value}
      onchange={updateAndValidate}
      {placeholder}
      class="select rounded"
    >
      {#each options as option}
        <option {...option}>{option.label}</option>
      {/each}
    </select>
  {:else if type === 'handle'}
    <div class="input-group input-group-divider grid-cols-[auto_1fr_auto]">
      <div class="input-group-shim">@</div>
      <Input
        {disabled}
        {value}
        type="text"
        oninput={updateAndValidate}
        {placeholder}
        {readonly}
      />
    </div>
  {:else if type === 'mock'}
    <div class="input-group input-group-divider {cols} rounded">
      {#if lead}<div class="input-group-shim">{@render lead?.()}</div>{/if}
      {@render children?.()}
      {#if tail}<div class="input-group-shim">{@render tail?.()}</div>{/if}
    </div>
  {:else}
    <div class="input-group input-group-divider {cols} rounded">
      {#if lead}<div class="input-group-shim">{@render lead?.()}</div>{/if}
      <Input
        {disabled}
        {value}
        {type}
        oninput={updateAndValidate}
        {placeholder}
        {readonly}
        {step}
      />
      {#if tail}<div class="input-group-shim">{@render tail?.()}</div>{/if}
    </div>
  {/if}
</Label>
