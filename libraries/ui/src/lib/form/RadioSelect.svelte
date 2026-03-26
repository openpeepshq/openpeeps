<script lang="ts">
	import Label from './Label.svelte';
	import type { ChangeEventHandler } from 'svelte/elements';
	import { uuidv4 } from 'uuidv7';

	interface Props {
		title?: string;
		description?: string;
		disabled?: boolean;
		value?: string;
		options: {
			title: string;
			description: string;
			value: string;
		}[];
		oninput?: ChangeEventHandler<HTMLInputElement>;
	}

	const idPrefix = `radio-select-${uuidv4()}-`;
	let {
		title = '',
		description = undefined,
		disabled = false,
		value = $bindable(),
		options,
		oninput: oninputProp
	}: Props = $props();

	const oninput: ChangeEventHandler<HTMLInputElement> = (e) => {
		value = e.currentTarget.value;
		oninputProp?.(e);
	};
</script>

<div class="flex flex-col gap-y-2 px-4" class:opacity-50={disabled}>
	<Label classes="text-lg font-medium">{title}</Label>
	{#if description}<div>{description}</div>{/if}
	{#each options as option}
		{@const id = `${idPrefix}-${option.value}`}
		<div class="flex gap-x-2">
			<input
				type="radio"
				{id}
				checked={value === option.value}
				{oninput}
				class="text-primary-500 mt-1 size-4"
				value={option.value}
				{disabled}
			/>
			<div>
				<label class="text-surface-700 font-medium" for={id}>{option.title}</label>
				<label class="text-surface-700" for={id}>{option.description}</label>
			</div>
		</div>
	{/each}
</div>
