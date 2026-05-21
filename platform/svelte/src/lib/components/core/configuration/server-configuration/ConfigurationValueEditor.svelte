<script lang="ts">
	// @ts-nocheck
	import { z, ZodType } from 'zod';
	import { unwrap } from '$lib/components/core/configuration/helpers';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		schema: ZodType;
		config: z.infer<ZodType>;
		defaults: z.infer<ZodType>;
		path: (string | number)[];
		value?: z.infer<ZodType>;
		unwrappedSchema?: unknown;
		disabled?: boolean;
	}

	let {
		schema,
		config,
		defaults,
		path,
		value = $bindable(),
		unwrappedSchema = unwrap(schema),
		disabled = schema.description === 'fixed'
	}: Props = $props();

	value = config;

	const password = schema.description === 'password';
	const longText = schema.description === 'longText';

	let dirty = $derived(value !== config);
</script>

<div class="my-2 pl-4">
	{#if unwrappedSchema instanceof z.ZodString}
		<label class="label">
			<span class:font-bold={dirty}>{t(String(path.slice(-1)[0]))}</span>
			{#if longText}
				<textarea bind:value class="input rounded" placeholder={defaults} {disabled}>
					{value}
				</textarea>
			{:else}
				<input
					type={password ? 'password' : 'text'}
					bind:value
					class="input rounded"
					placeholder={defaults}
					{disabled}
				/>
			{/if}
		</label>
	{:else if unwrappedSchema instanceof z.ZodNumber}
		<label class="label">
			<span class:font-bold={dirty}>{t(String(path.slice(-1)[0]))}</span>
			<input bind:value type="number" class="input rounded" placeholder={defaults} {disabled} />
		</label>
	{:else if unwrappedSchema instanceof z.ZodBoolean}
		<label class="flex items-center space-x-2">
			<input bind:checked={value} class="checkbox" type="checkbox" {disabled} />
			<span class:font-bold={dirty}>{t(String(path.slice(-1)[0]))}</span>
		</label>
	{:else if unwrappedSchema instanceof z.ZodEnum}
		<p class:font-bold={dirty}>{t(String(path.slice(-1)[0]))}</p>
		{#each (unwrappedSchema.options ?? (unwrappedSchema._def?.entries ? Object.keys(unwrappedSchema._def.entries) : [])) as option}
			<label class="flex items-center space-x-2">
				<input
					bind:group={value}
					class="radio"
					type="radio"
					name={path.join('-')}
					value={option}
					{disabled}
				/>
				<span>{option}</span>
			</label>
		{/each}
	{/if}
</div>
