<script lang="ts">
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import { i18nContext } from '$lib/components/i18n';
	import type { CreateInfiniteQueryResult, InfiniteData } from '@tanstack/svelte-query';
	import type { PublicPost } from '@openpeeps/common/types';
	import EventsFeed from './EventsFeed.svelte';
	const { t } = i18nContext();

	interface Props {
		upcomingQuery: CreateInfiniteQueryResult<InfiniteData<PublicPost[], unknown>>;
		pastQuery: CreateInfiniteQueryResult<InfiniteData<PublicPost[], unknown>>;
		type?: 'event' | 'jam';
	}

	let { upcomingQuery, pastQuery, type = 'event' }: Props = $props();

	let tabSet: number = $state(0);
</script>

<TabGroup>
	<Tab bind:group={tabSet} name="tab1" value={0}>
		<span class="text-sm">{t('events.feed.upcoming')}</span>
	</Tab>
	<Tab bind:group={tabSet} name="tab2" value={1}>
		<span class="text-sm">{t('events.feed.past')}</span>
	</Tab>
	{#snippet panel()}
		{#if tabSet === 0}
			<EventsFeed query={upcomingQuery} {type} />
		{:else if tabSet === 1}
			<EventsFeed query={pastQuery} />
		{/if}
	{/snippet}
</TabGroup>
