<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { me } from '$lib/api';
	import type { GroupWithMeta } from '@openpeeps/common/types';
	import { goto } from '$app/navigation';
	import { joinGroupMutation } from '$lib/api';
	import { checkGroupCapabilities } from '@openpeeps/common';
	import { i18nContext } from '@openpeeps/svelte/components';

	interface Props {
		group: GroupWithMeta;
	}

	let { group }: Props = $props();
	const { t } = i18nContext();
	const joinGroup = joinGroupMutation({ id: group.id });

	const doJoinGroup = async () => {
		await joinGroup();
		await goto('/groups/@' + group.handle);
	};
</script>

<div class="">
	{#if $me?.memberships.find((m) => m.group.id === group.id)}
		<Button title="View posts" variant="variant-ringed-surface" action="/groups/@{group.handle}"
			>View posts</Button
		>
	{:else if checkGroupCapabilities(['core-groups-join'], $me, group).success}
		<Button title={t('groups.join.submit')} variant="variant-ringed-surface" action={doJoinGroup}>{t('groups.join.submit')}</Button>
	{/if}
</div>
