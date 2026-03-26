<script lang="ts" module>
	import type { ZodRawShape } from 'zod';

	type T = ZodRawShape;
</script>

<script lang="ts">
	import {
		Button,
		deepGet,
		deepSet,
		getFormContext,
		Input,
		Label,
		LoadingIcon,
		pathToString
	} from '@openpeeps/ui';
	import { MapPin } from 'lucide-svelte';
	import type { GeocodingResult, Location } from '@openpeeps/common';
	import type { FormEventHandler } from 'svelte/elements';
	import { geocode } from '$lib/api/location';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	const { messagesStore, data, validate } = getFormContext<T>();

	interface Props {
		title?: string;
		description?: string;
		path: (number | string)[];
		placeholder?: string;
		dirty?: boolean;
		disabled?: boolean;
		readonly?: boolean;
	}

	let {
		title = '',
		description = '',
		path,
		placeholder = title,
		dirty = $bindable(false),
		disabled = false,
		readonly = false
	}: Props = $props();

	let name = $state((deepGet(data, path) as Location)?.text || '');

	let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
	let debouncedGeocode = (query: string) => {
		if (debounceTimeout) {
			clearTimeout(debounceTimeout);
		}
		if (query.length < 3) {
			return undefined;
		}
		return new Promise<GeocodingResult[]>((resolve) => {
			debounceTimeout = setTimeout(async () => {
				const results = await geocode(query.trim());
				resolve(results);
			}, 1500);
		});
	};

	let suggestionsPromise: Promise<GeocodingResult[]> | undefined = $state(undefined);

	const onSelection = (geocodingResult: Partial<GeocodingResult> & { name: string }) => {
		dirty = true;
		const location = {
			text: geocodingResult.name,
			coordinates: geocodingResult.center
		};
		deepSet(data, path, location);
		name = geocodingResult.name;
		suggestionsPromise = undefined;
		validate();
	};

	const updateAndValidate: FormEventHandler<HTMLInputElement> = (e) => {
		const text = e.currentTarget.value;
		dirty = true;
		suggestionsPromise = debouncedGeocode(text);
		deepSet(data, path, { text });
		validate();
	};
</script>

<Label
	{title}
	{description}
	messages={dirty ? $messagesStore[pathToString(path)] : []}
	classes="relative"
>
	<div class="input-group input-group-divider grid-cols-[auto_1fr_auto] rounded-full">
		<div class="input-group-shim"><MapPin class="size-4" /></div>
		<Input
			bind:value={name}
			type="text"
			{placeholder}
			{disabled}
			{readonly}
			oninput={updateAndValidate}
		/>
	</div>
	{#if suggestionsPromise}
		<div class="card absolute bottom-16 flex w-full flex-col items-start gap-3 p-2 text-sm">
			{#await suggestionsPromise}
				<div class="flex w-full flex-col items-center justify-center gap-2 p-4">
					<span>{t('location.lookup', { name })}</span>
					<LoadingIcon />
				</div>
			{:then suggestions}
				<Button
					class="border-surface-300 hover:bg-surface-hover-token w-full rounded p-2 text-left"
					action={() => onSelection({ name })}
				>
					{name}
				</Button>
				{#each suggestions! as geocodingResult, index (index)}
					<Button
						class="border-surface-300 hover:bg-surface-hover-token w-full rounded p-2 text-left"
						action={() => onSelection(geocodingResult)}
					>
						{geocodingResult.name}
					</Button>
				{/each}
			{/await}
		</div>
	{/if}
</Label>
