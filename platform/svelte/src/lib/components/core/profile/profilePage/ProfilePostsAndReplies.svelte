<script lang="ts">
	import { ProfileFeed } from '$lib/components/core/post';
	import { TabGroup, Tab } from '@skeletonlabs/skeleton';
	import type { PublicProfile } from '@openpeeps/common/types';
	import { i18nContext } from '$lib/components/i18n';
	import { goto } from '$app/navigation';
	import { commonGroupsStore } from '@openpeeps/svelte/api';
	import { Loader, preventDefault, stopPropagation } from '@openpeeps/ui';
	import GroupCard from '../../groups/GroupCard.svelte';
	import { Users } from 'lucide-svelte';
  import { AccessDeniedLoader } from '$lib/components/layout';

	const { t } = i18nContext();

	interface Props {
		profile: PublicProfile;
	}

	let { profile }: Props = $props();

	let tabSet: number = $state(0);
	const commonGroupsQuery = commonGroupsStore(profile.id);
</script>

<TabGroup>
	<Tab bind:group={tabSet} name="tab1" value={0}>
		<span class="text-sm">{t('profile.posts')}</span>
	</Tab>
	<Tab bind:group={tabSet} name="tab2" value={1}>
		<span class="text-sm">{t('profile.groups.tabName')}</span>
	</Tab>
	{#snippet panel()}
		{#if tabSet === 0}
			<ProfileFeed {profile} />
		{:else if tabSet === 1}
			<AccessDeniedLoader queries={[$commonGroupsQuery]}>
				{#each $commonGroupsQuery.data || [] as group (group.id)}
					<button
						title="Open group"
						class="w-full"
						onclick={stopPropagation(preventDefault(() => goto(`/groups/@${group.handle}`)))}
					>
						<GroupCard {group} />
					</button>
				{/each}
				{#if !$commonGroupsQuery.data?.length}
					<div class="flex h-[60vh] w-full flex-col items-center justify-center gap-y-6">
						<Users size={60} />
						<p>{t('profile.groups.noCommonGroups')}</p>
					</div>
				{/if}
			</AccessDeniedLoader>
		{/if}
	{/snippet}
</TabGroup>
