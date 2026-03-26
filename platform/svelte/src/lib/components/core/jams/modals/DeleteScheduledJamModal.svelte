<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';
	import { Button, getModalManager } from '@openpeeps/ui';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { deletePostMutation } from '$lib/api';
	import { useQueryClient } from '@tanstack/svelte-query';
	import type { PublicPost } from '@openpeeps/common/types';

	interface Props {
		event: PublicPost;
	}

	let { event }: Props = $props();

	// ------------ STORES --------------
	const toastStore = getToastStore();
	const modalManager = getModalManager();
	const queryClient = useQueryClient();

	const deleteEvent = deletePostMutation({
		id: event.id
	});

	const handleDeleteEvent = async () => {
		await deleteEvent(event);
		toastStore.trigger(
			toast({
				message: 'Event deleted successfully!',
				background: 'variant-filled-success'
			})
		);
		await queryClient.invalidateQueries({ queryKey: ['jams'] });
		await queryClient.invalidateQueries({ queryKey: ['posts'] });
		modalManager.close();
	};
</script>

<ModalWrapper extraClassNames="md:w-1/3">
	<ModalHeader title={'Delete this Jam?'} />
	<article class=" flex flex-col">
		<div class="w-full p-2">
			This jam details will no longer be available for anyone including you. Would you still like to
			delete this jam?
		</div>
	</article>
	<ModalFooter>
		<div></div>
		<div class="flex gap-x-2">
			<Button title="Cancel" variant="variant-ringed-surface" action={modalManager.close}
				>Cancel</Button
			>
			<Button title="Delete Event" variant="variant-filled-error" action={handleDeleteEvent}>
				Delete
			</Button>
		</div>
	</ModalFooter>
</ModalWrapper>
