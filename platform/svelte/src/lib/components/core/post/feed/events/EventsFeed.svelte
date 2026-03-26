<script lang="ts">
	import type { PublicPost } from '@openpeeps/common/types';
	import type { CreateInfiniteQueryResult, InfiniteData } from '@tanstack/svelte-query';
	import { Calendar, PhoneOff } from 'lucide-svelte';
	import { InfiniteScrollContainer } from '@openpeeps/ui';
	import { CardEvent } from '../..';
	import { i18nContext } from '@openpeeps/svelte/components';
	const { t } = i18nContext();

	interface Props {
		query: CreateInfiniteQueryResult<InfiniteData<PublicPost[], unknown>>;
		type?: 'event' | 'jam';
	}

	let { query, type = 'event' }: Props = $props();
</script>

<InfiniteScrollContainer {query} uniqueBy={(post) => post.id}>
	{#snippet children({ list })}
		<div class="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
			{#each list as post (post.id)}
				<CardEvent {post} />
			{/each}
		</div>
	{/snippet}
	{#snippet empty()}
		<div class="flex h-72 w-full flex-col items-center justify-center gap-y-6">
			{#if type === 'jam'}
				<PhoneOff size={60} />
			{:else}
				<Calendar size={60} />
			{/if}
			<p>{t('events.feed.empty', { type })}</p>
		</div>
	{/snippet}
</InfiniteScrollContainer>
