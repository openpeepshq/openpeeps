<script lang="ts">
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';
	import { Button } from '@openpeeps/ui';
	import { restoreBackupMutation } from '$lib/api';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const restoreBackup = restoreBackupMutation();

	const toastStore = getToastStore();
	const modalStore = getModalStore();

	const handleRestoreBackup = async () => {
		const name = 'test-backup.zip';
		const response = await fetch(`/template/${name}`);
		const blob = await response.blob();
		const file = new File([blob], name, { type: 'application/zip' });

		await restoreBackup(file)
			.then(() => {
				toastStore.trigger(
					toast({
						message: t('admin.backups.testRestore.restoreSuccess'),
						background: 'variant-filled-success'
					})
				);
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('admin.backups.testRestore.restoreError'),
						background: 'variant-filled-error'
					})
				);
			})
			.finally(() => {
				modalStore.close();
			});
	};
</script>

{#if $modalStore[0]}
	<ModalWrapper>
		<ModalHeader title={t('admin.backups.testRestore.title')} />
		<article class="flex flex-col p-4">
			<div class="mt-4 w-full">{t('admin.backups.testRestore.confirm')}</div>
		</article>
		<ModalFooter>
			<div class="flex w-full justify-between">
				<Button title={t('admin.backups.testRestore.cancel')} variant="variant-ghost-primary" action={modalStore.close}
					>{t('admin.backups.testRestore.cancel')}</Button
				>
				<Button title={t('admin.backups.testRestore.continue')} variant="variant-filled-primary" action={handleRestoreBackup}>
					{t('admin.backups.testRestore.continue')}
				</Button>
			</div>
		</ModalFooter>
	</ModalWrapper>
{/if}
