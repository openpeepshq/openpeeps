<script lang="ts">
	// @ts-nocheck
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { ModalFooter, ModalHeader, ModalWrapper, Button } from '@openpeeps/ui';
	import { toast } from '$lib/utils/toast';
	import { deleteProfileMutation, deleteAccountMutation } from '$lib/api';
	import type { PublicProfile } from '@openpeeps/common/types';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	const modalStore = getModalStore();
	const toastStore = getToastStore();

	interface Props {
		profile: PublicProfile;
	}

	let { profile }: Props = $props();

	const deleteProfile = deleteProfileMutation({ id: profile.id });
	const deleteAccount = deleteAccountMutation({
		id: profile.controllers[0].id
	});

	const handleDeleteProfile = async () => {
		await (profile &&
			deleteProfile()
				.then(() => {
					toastStore.trigger(
						toast({
							message: t('profile.modals.deleteProfile.profileDeleted')
						})
					);
				})
				.catch(() => {
					toastStore.trigger(
						toast({
							message: t('profile.modals.deleteProfile.profileDeleteError')
						})
					);
				}));
		await deleteAccount()
			.then(() => {
				toastStore.trigger(
					toast({
						message: t('profile.modals.deleteProfile.accountDeleted')
					})
				);
				modalStore.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('profile.modals.deleteProfile.accountDeleteError')
					})
				);
			});
	};
</script>

<ModalWrapper width={'md:w-1/3 w-modal'}>
	<!-- header -->
	<ModalHeader title={t('profile.modals.deleteProfile.title')} />
	<!-- content -->
	<div class="p-4">
		<p>
			{t('profile.modals.deleteProfile.description', {username: profile.displayName, handle: profile.handle})}
		</p>
	</div>

	<!-- footer -->
	<ModalFooter extraClassNames={'gap-x-4'}>
		<div></div>
		<div class="flex gap-x-2">
			<Button title={t('common.cancel')} variant="variant-ringed-surface" action={modalStore.close}
				>{t('common.cancel')}</Button
			>
			<Button
				title={t('profile.modals.deleteProfile.delete')}
				action={handleDeleteProfile}
				variant="variant-filled-error">{t('profile.modals.deleteProfile.delete')}</Button
			>
		</div>
	</ModalFooter>
</ModalWrapper>
