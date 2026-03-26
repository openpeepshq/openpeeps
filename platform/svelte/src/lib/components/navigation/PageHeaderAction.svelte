<script lang="ts">
	import { Button } from '@openpeeps/ui';

	interface Props {
		title: string;
		action?: () => Promise<void> | void;
	}

	let { title, action }: Props = $props();
</script>

<Button {title} class="h-6 w-fit text-sm" variant="variant-ringed-surface" {action}>
	<span>{title}</span>
</Button>
