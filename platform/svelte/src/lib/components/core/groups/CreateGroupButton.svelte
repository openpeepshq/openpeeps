<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { me } from '$lib/api';

	interface Props {
		handleSubmit: () => void | Promise<void>;
	}

	let { handleSubmit }: Props = $props();
	const action = async () => {
		await handleSubmit();
	};
</script>

{#if $me}
	<Button title="Create Group" variant="variant-ringed-primary" {action}>Create</Button>
{/if}
