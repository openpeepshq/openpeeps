<script lang="ts">
	import { removeMemberMutation } from '$lib/api';
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper, Button } from '@openpeeps/ui';
	import { toast } from '$lib/utils/toast';
	import type { GroupWithMeta, PublicProfile } from '@openpeeps/common/types';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		group: GroupWithMeta;
		profile: PublicProfile;
	}

	const { t } = i18nContext();
	let { group, profile }: Props = $props();
	const modalManager = getModalManager();
	const toastStore = getToastStore();

	const removeMember = removeMemberMutation({ id: group.id, memberId: profile.id });

	const doRemoveMember = async () => {
		removeMember()
			.then(() => {
				toastStore.trigger(
					toast({
						message: t('groups.removeMember.successMessage')
					})
				);
				modalManager.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('groups.removeMember.errorMessage')
					})
				);
			});
	};
</script>

<ModalWrapper>
	<ModalHeader title={t('groups.removeMember.title')} />
	<div class="p-4">
		{t('groups.removeMember.description', {
			handle: profile.handle
		})}
	</div>
	<ModalFooter extraClassNames="flex justify-end w-full">
		<Button title={t('common.cancel')} variant="variant-ringed-primary" action={modalManager.close}
			>{t('common.cancel')}</Button
		>
		<Button
			title={t('groups.removeMember.confirm')}
			variant="variant-filled-error"
			action={doRemoveMember}
		>
			{t('groups.removeMember.confirm')}
		</Button>
	</ModalFooter>
</ModalWrapper>
