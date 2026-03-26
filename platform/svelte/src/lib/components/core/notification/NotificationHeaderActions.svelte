<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { NotificationPreferences } from '$lib/components/core/notification/index.js';
	import { Settings2 } from 'lucide-svelte';
	const modalStore = getModalStore();
</script>

<Button
	title="Notification Preferences"
	action={() =>
		modalStore.trigger({
			type: 'component',
			component: {
				ref: NotificationPreferences
			}
		})}
	variant="variant-ringed-surface"
>
	<Settings2 size={18} />
</Button>
