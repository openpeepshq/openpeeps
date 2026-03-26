<script lang="ts">
	import type { GroupWithMeta, PublicProfile } from '@openpeeps/common/types';
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { groupName } from '@openpeeps/common/lib';
	import { Button } from '@openpeeps/ui';
	import { ProfileSelector } from '$lib/components/core/profile';
	import { addMemberMutation, groupMembersStore } from '$lib/api';

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
	<ModalHeader title="Add Members to {groupName(group)}" />
	<div class="p-2">
		<ProfileSelector
			bind:selectedProfiles
			overRide
			profilesToExclude={$membersQuery.data?.map((m) => m.profile) || []}
		/>
	</div>
	<ModalFooter extraClassNames="flex justify-end w-full">
		<Button title="Cancel" variant="variant-ringed-primary" action={modalManager.close}
			>Cancel</Button
		>
		<Button
			title="Add"
			disabled={!selectedProfiles.length}
			variant="variant-filled-primary"
			action={addMembersAndClose}
		>
			Add
		</Button>
	</ModalFooter>
</ModalWrapper>
