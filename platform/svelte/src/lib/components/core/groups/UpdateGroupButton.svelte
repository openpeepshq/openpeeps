<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { me } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

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
	<Button title={t('groups.actions.updateGroup')} variant="variant-ringed-primary" {loading} {action}>{t('groups.actions.update')}</Button>
{/if}
