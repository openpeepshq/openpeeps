<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { NotificationPreferences } from '$lib/components/core/notification/index.js';
	import { Settings2 } from 'lucide-svelte';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const modalStore = getModalStore();
</script>

<Button
	title={t('settings.notifications.headerPreferencesTitle')}
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
