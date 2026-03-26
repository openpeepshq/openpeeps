<script lang="ts">
	import { Loader } from '@openpeeps/ui';
	import { groupStore } from '$lib/api';
	import GroupCard from '$lib/components/core/groups/GroupCard.svelte';
  import { AccessDeniedLoader } from '$lib/components/layout';

	interface Props {
		groupId?: string | undefined;
		avatarSize?: number;
		showAction?: boolean;
		noPadding?: boolean;
		oneLine?: boolean;
	}

	let {
		groupId = undefined,
		avatarSize = 3.5,
		showAction = true,
		noPadding = false,
		oneLine = false
	}: Props = $props();

	const groupQuery = groupStore(groupId || '');
</script>

<AccessDeniedLoader queries={[$groupQuery]}>
	{#if $groupQuery.data}
		<GroupCard group={$groupQuery.data} {avatarSize} {showAction} {noPadding} {oneLine} />
	{/if}
</AccessDeniedLoader>
