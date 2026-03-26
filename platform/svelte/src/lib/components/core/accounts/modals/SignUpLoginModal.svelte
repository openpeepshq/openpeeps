<script lang="ts">
	import { Button, getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { goto } from '$app/navigation';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const modalManager = getModalManager();
</script>

<ModalWrapper>
	<ModalHeader title={t('accounts.login.title')} />
	<article class="flex flex-col p-4">
		<p class="">{t('accounts.login.description')}</p>
	</article>

	<ModalFooter>
		<Button title={t('common.cancel')} variant="variant-ringed-surface" action={modalManager.close}
			>{t('common.cancel')}</Button
		>
		<Button
			title={t('accounts.login.loginButton')}
			variant="variant-filled-primary"
			action={async () => {
				await goto('/auth/login');
				modalManager.close();
			}}
		>
			{t('accounts.login.loginButton')}
		</Button>
	</ModalFooter>
</ModalWrapper>
