<script lang="ts">
	import type { GroupWithMeta, PublicProfile } from '@openpeeps/common/types';
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { groupName } from '@openpeeps/common/lib';
	import { Button } from '@openpeeps/ui';
	import { ProfileSelector } from '$lib/components/core/profile';
	import { addMemberMutation, groupMembersStore } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		group: GroupWithMeta;
	}

	let { group }: Props = $props();

	const addMember = addMemberMutation({ id: group.id });
	const membersQuery = groupMembersStore(group.id);

	let members = $derived($membersQuery.data || []);
	let selectedProfiles: PublicProfile[] = $state([]);

	const modalManager = getModalManager();

	const addMembersAndClose = async () => {
		for (const profile of selectedProfiles) {
			await addMember(profile);
		}
		modalManager.close();
	};
</script>

<ModalWrapper>
	<ModalHeader title={t('groups.modals.addMembers.title', { groupName: groupName(group) })} />
	<div class="p-2">
		<ProfileSelector
			bind:selectedProfiles
			overRide
			profilesToExclude={$membersQuery.data?.map((m) => m.profile) || []}
		/>
	</div>
	<ModalFooter extraClassNames="flex justify-end w-full">
		<Button title={t('common.cancel')} variant="variant-ringed-primary" action={modalManager.close}
			>{t('common.cancel')}</Button
		>
		<Button
			title={t('groups.modals.addMembers.add')}
			disabled={!selectedProfiles.length}
			variant="variant-filled-primary"
			action={addMembersAndClose}
		>
			{t('groups.modals.addMembers.add')}
		</Button>
	</ModalFooter>
</ModalWrapper>
