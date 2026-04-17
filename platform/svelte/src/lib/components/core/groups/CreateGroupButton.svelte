<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { me } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		handleSubmit: () => void | Promise<void>;
	}

	let { handleSubmit }: Props = $props();
	const action = async () => {
		await handleSubmit();
	};
</script>

{#if $me}
	<Button title={t('groups.create.title')} variant="variant-ringed-primary" {action}>{t('groups.create.submit')}</Button>
{/if}
