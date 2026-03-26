<script lang="ts" module>
	import type { ZodRawShape } from 'zod';

	type T = ZodRawShape;
</script>

<script lang="ts" generics="T extends ZodRawShape">
	import Label from './Label.svelte';
	import { getFormContext, deepGet, deepSet } from '$lib';
	import type { ChangeEventHandler } from 'svelte/elements';

	const { data, validate } = getFormContext<T>();

	interface Props {
		name: string;
		title?: string;
		description?: string;
		descriptionTrue?: string;
		titleTrue?: string;
		descriptionFalse?: string;
		titleFalse?: string;
		path: string[];
		dirty?: boolean;
		disabled?: boolean;
		value?: boolean;
		initialValue?: boolean;
	}

	let {
		name,
		title = '',
		description = undefined,
		descriptionTrue = '',
		titleTrue = '',
		descriptionFalse = '',
		titleFalse = '',
		path,
		dirty = $bindable(false),
		disabled = false,
		value = false
	}: Props = $props();

	const updateAndValidate: ChangeEventHandler<HTMLInputElement> = (e) => {
		value = e.currentTarget.value === 'true';
		deepSet(data, path, value);
		dirty = true;
		validate();
	};

	let currentValue = $derived(deepGet(data, path) === true);
</script>

<div class="flex flex-col gap-y-2 px-4" class:opacity-50={disabled}>
	<Label classes="text-lg font-medium">{title}</Label>
	{#if description}<div>{description}</div>{/if}
	<div class="flex gap-x-2">
		<input
			type="radio"
			{name}
			id={`${name}-false`}
			checked={!currentValue}
			oninput={updateAndValidate}
			class="text-primary-500 mt-1 size-4"
			value="false"
			{disabled}
		/>
		<div>
			<label class="text-surface-700 font-medium" for={`${name}-false`}>{titleFalse}</label>
			<label class="text-surface-700" for={`${name}-false`}>{descriptionFalse}</label>
		</div>
	</div>
	<div class="flex gap-x-2">
		<input
			type="radio"
			{name}
			id={`${name}-true`}
			checked={currentValue}
			oninput={updateAndValidate}
			class="text-primary-500 mt-1 size-4"
			value="true"
			{disabled}
		/>
		<div>
			<label class="text-surface-700 font-medium" for={`${name}-true`}>{titleTrue}</label>
			<label class="text-surface-700" for={`${name}-false`}>{descriptionTrue}</label>
		</div>
	</div>
</div>
