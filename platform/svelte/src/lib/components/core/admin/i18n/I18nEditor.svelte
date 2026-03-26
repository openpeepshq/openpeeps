<script lang="ts">
	import { deepGet, deepSet, ExpandableBox, Input, Label } from '@openpeeps/ui';
	import type { Resource, ResourceKey } from 'i18next';

	const {
		defaults,
		merged,
		overrides,
		newOverrides = $bindable()
	}: {
		defaults: Resource;
		merged: Resource;
		overrides: Resource;
		newOverrides: Resource;
	} = $props();

	let languages = $derived(Object.keys(merged));
</script>

{#snippet editor(defaults: Resource, merged: Resource, path: string[])}
	<ExpandableBox initialOpen>
		{#snippet title()}
			<div class="font-bold">{path.slice(-1)[0]}</div>
		{/snippet}
		{#each languages as language (language)}
			<Label title={language} inline>
				<Input
					value={deepGet(overrides[language], path)}
					placeholder={deepGet(defaults[language], path) as string}
					oninput={(e) => {
						const value = (e.target as HTMLInputElement).value.trim();
						deepSet(overrides, [language, ...path], value || undefined);
						Object.assign(newOverrides, structuredClone(overrides));
					}}
				/>
			</Label>
		{/each}
	</ExpandableBox>
{/snippet}

{#snippet namespace(defaults: Resource, merged: Resource, path: string[] = [])}
	{@const currentNamespace = (
		path.length ? deepGet(merged['en'], path) : merged['en']
	) as ResourceKey}
	<ExpandableBox initialOpen={path.length === 0}>
		{#snippet title()}
			<div class="font-bold">{path.length ? path.slice(-1)[0] : 'AllPeeP Core'}</div>
		{/snippet}
		{#each Object.entries(currentNamespace) as [key, value] (key)}
			{#if typeof value === 'string'}
				{@render editor(defaults, merged, [...path, key])}
			{:else}
				{@render namespace(defaults, merged, [...path, key])}
			{/if}
		{/each}
	</ExpandableBox>
{/snippet}

{@render namespace(defaults, merged)}
