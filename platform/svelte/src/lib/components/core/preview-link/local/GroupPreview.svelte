<script lang="ts">
	import { groupByHandleStore } from '$lib/api';
	import GroupCard from '../../groups/GroupCard.svelte';
	import { AccessDeniedLoader } from '$lib/components/layout';

	interface Props {
		path: string;
	}

	let { path }: Props = $props();

	const groupQuery = groupByHandleStore(path.substring(9));

	const group = $derived($groupQuery.data);
</script>

<AccessDeniedLoader queries={[$groupQuery]}>
	{#if group}
		<GroupCard {group} showAction={false} />
	{/if}
</AccessDeniedLoader>
