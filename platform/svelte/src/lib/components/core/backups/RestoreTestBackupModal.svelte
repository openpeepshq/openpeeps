<script lang="ts">
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';
	import { Button } from '@openpeeps/ui';
	import { restoreBackupMutation } from '$lib/api';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';

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
						message: 'Backup restored successfully',
						background: 'variant-filled-success'
					})
				);
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: 'Error using test backup',
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
		<ModalHeader title={'Use Test Backup'} />
		<article class="flex flex-col p-4">
			<div class="mt-4 w-full">Are you sure you want to use Test Backup data?</div>
		</article>
		<ModalFooter>
			<div class="flex w-full justify-between">
				<Button title="Back" variant="variant-ghost-primary" action={modalStore.close}
					>Cancel</Button
				>
				<Button title="Done" variant="variant-filled-primary" action={handleRestoreBackup}>
					Continue
				</Button>
			</div>
		</ModalFooter>
	</ModalWrapper>
{/if}
