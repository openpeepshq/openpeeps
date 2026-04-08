<script lang="ts">
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { Button, ModalFooter, ModalHeader, ModalWrapper, Input } from '@openpeeps/ui';
	import type { ProfileWithMeta } from '@openpeeps/common/types';
	import { updateAccountMutation } from '$lib/api';
	import { toast } from '$lib/utils/toast';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	const modalStore = getModalStore();
	const toastStore = getToastStore();
	interface Props {
		profile: ProfileWithMeta;
		editCallback?: (() => void) | undefined;
	}

	let { profile, editCallback }: Props = $props();
	let oldEmail = profile.controllers[0].email;
	let newEmail = $state(profile.controllers[0].email);

	const updateAccountEmail = updateAccountMutation({
		id: profile.controllers[0].id
	});

	const handleEditEmail = async () => {
		if (newEmail === oldEmail) {
			toastStore.trigger(
				toast({
					message: t('accounts.editEmail.sameEmail')
				})
			);
			return;
		}
		await updateAccountEmail({ newEmail: newEmail, oldEmail: oldEmail })
			.then(() => {
				toastStore.trigger(
					toast({
						message: t('accounts.editEmail.updateSuccess')
					})
				);
				editCallback?.();
				modalStore.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('accounts.editEmail.updateError')
					})
				);
			});
	};
</script>

{#if $modalStore[0]}
	<ModalWrapper width={'md:w-1/3 w-modal'}>
		<!-- header -->
		<ModalHeader title={t('accounts.editEmail.title')} />
		<!-- content -->
		<div class="px-4 py-2">
			<p>{t('accounts.editEmail.description')}</p>
			<div class="mt-4"></div>
			<p>{t('accounts.editEmail.emailLabel')}</p>
			<Input bind:value={newEmail} />
		</div>

		<!-- footer -->
		<ModalFooter extraClassNames={'w-full'}>
			<Button
				title={t('accounts.editEmail.saveChanges')}
				class="w-full"
				action={handleEditEmail}
				variant="variant-filled-primary">{t('accounts.editEmail.saveChanges')}</Button
			>
		</ModalFooter>
	</ModalWrapper>
{/if}
