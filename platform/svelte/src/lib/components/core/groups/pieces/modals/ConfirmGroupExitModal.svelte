<script lang="ts">
	import { exitMutation } from '$lib/api';
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper, Button } from '@openpeeps/ui';
	import { toast } from '$lib/utils/toast';
	import type { GroupWithMeta, PublicProfile } from '@openpeeps/common/types';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';

	interface Props {
		group: GroupWithMeta;
		profile: PublicProfile;
	}

	let { group, profile }: Props = $props();
	const modalManager = getModalManager();
	const toastStore = getToastStore();

	const leaveGroup = exitMutation({ id: group.id });

	const doExit = async () => {
		leaveGroup()
			.then(async () => {
				toastStore.trigger(
					toast({
						message: 'You have been successfully removed.'
					})
				);
				await goto('/groups');
				modalManager.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: 'An error occurred while removing.'
					})
				);
			});
	};
</script>

<ModalWrapper>
	<ModalHeader title="Leave Group" />
	<div class="p-4">
		Are you sure you want to exit from group: <strong>{group.handle}</strong>?
	</div>
	<ModalFooter extraClassNames="flex justify-end w-full">
		<Button title="Cancel" variant="variant-ringed-primary" action={modalManager.close}
			>Cancel</Button
		>
		<Button title="Leave" variant="variant-filled-error" action={doExit}>Leave</Button>
	</ModalFooter>
</ModalWrapper>
