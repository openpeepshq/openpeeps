<script lang="ts">
	import { deleteAccountMutation, deleteProfileMutation, profileStore } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';
	import { toast } from '$lib/utils';
	import type { PublicProfile, ReportWithMeta } from '@openpeeps/common';
	import { Button, getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { getToastStore } from '@skeletonlabs/skeleton';

	interface Props {
		profileId: string;
		deleteCallback?: (() => void) | undefined;
	}

	let { profileId, deleteCallback = undefined }: Props = $props();
	const toastStore = getToastStore();

	const { t } = i18nContext();
	const modalManager = getModalManager();

	const deleteProfile = deleteProfileMutation({ id: profileId });

	const handleDeleteProfile = async () => {
		await (profileId &&
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
	};
</script>

<ModalWrapper extraClassNames="relative">
	<ModalHeader title={t('admin.moderation.profile.delete.title')} />
	<article class="  m-4 h-full pb-3">
		<p class="my-4">{t('admin.moderation.profile.delete.description')}</p>
	</article>
	<ModalFooter>
		<Button
			title={t('admin.moderation.profile.delete.cancel')}
			action={() => modalManager.close()}
			variant="variant-ringed-surface"
			class="w-full"
		>
			{t('admin.moderation.profile.delete.cancel')}
		</Button>
		<Button
			title={t('admin.moderation.profile.delete.confirm')}
			action={handleDeleteProfile}
			variant="variant-filled-error"
			class="w-full"
		>
			{t('admin.moderation.profile.delete.confirm')}
		</Button>
	</ModalFooter>
</ModalWrapper>
