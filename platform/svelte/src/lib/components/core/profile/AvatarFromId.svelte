<script lang="ts">
	import { Avatar } from '.';
	import { profileStore } from '$lib/api';
	import { Loader } from '@openpeeps/ui';
	import type { ComponentProps } from 'svelte';

	type Props = Omit<ComponentProps<typeof Avatar>, 'profile'> & {
		id: string;
	};

	let { id, ...props }: Props = $props();

	let profileQuery = profileStore(id);
</script>

<Loader queries={[$profileQuery]}>
	<Avatar profile={$profileQuery.data} {...props} />
</Loader>
