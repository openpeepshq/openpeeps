<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { me } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		handleSubmit: () => void | Promise<void>;
	}

	let { handleSubmit }: Props = $props();
	const { t } = i18nContext();
	const action = async () => {
		await handleSubmit();
	};
</script>

{#if $me}
	<Button 
		title={t('groups.create.title')}
		variant="variant-ringed-primary" 
		{action}>
			{t('groups.create.title')}
	</Button>
{/if}
