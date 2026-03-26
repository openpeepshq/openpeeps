<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { ArchiveRestore, DatabaseBackup } from 'lucide-svelte';
	import { createBackupMutation } from '$lib/api';
	import { toast } from '$lib/utils/toast';
	import { getModalStore, getToastStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import RestoreBackupModal from '$lib/components/core/backups/RestoreBackupModal.svelte';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	const toastStore = getToastStore();

	const createBackup = createBackupMutation();

	const handleCreateBackup = async () =>
		createBackup()
			.then(() =>
				toastStore.trigger(
					toast({
						message: t('admin.backups.createSuccess'),
						background: 'variant-filled-success'
					})
				)
			)
			.catch((err) =>
				toastStore.trigger(
					toast({
						message: t('admin.backups.createError', { error: err.message }),
						background: 'variant-filled-error'
					})
				)
			);

	const modalStore = getModalStore();

	export const restoreModal: ModalSettings = {
		type: 'component',
		component: { ref: RestoreBackupModal }
	};
</script>

<div class="flex items-center gap-5">
	<Button
		title={t('admin.backups.createTitle')}
		variant="variant-filled-primary"
		action={handleCreateBackup}
	>
		<DatabaseBackup color="white" size={18} />
		<span class="text-on-primary-token hidden md:flex">{t('admin.backups.createTitle')}</span>
	</Button>
	<Button
		title={t('admin.backups.restoreTitle')}
		variant="variant-filled-primary"
		action={() => modalStore.trigger(restoreModal)}
	>
		<ArchiveRestore color="white" size={18} />
		<span class="text-on-primary-token hidden md:flex">{t('admin.backups.restoreTitle')}</span>
	</Button>
</div>
