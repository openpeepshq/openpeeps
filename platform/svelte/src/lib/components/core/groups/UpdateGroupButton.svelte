<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { me } from '$lib/api';

	interface Props {
		handleSubmit: () => void | Promise<void | string> | string;
	}

	let { handleSubmit }: Props = $props();

	let loading = $state(false);

	const action = async () => {
		loading = true;
		await handleSubmit();
		loading = false;
	};
</script>

{#if $me}
	<Button title="Update group" variant="variant-ringed-primary" {loading} {action}>Update</Button>
{/if}
