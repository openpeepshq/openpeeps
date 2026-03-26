<script lang="ts">
	import { Button } from '@openpeeps/ui';

	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import type { PublicPost } from '@openpeeps/common/types';
	import { jamAttendanceStore } from '$lib/api';
	import { ProfileFromId } from '../../profile';
	import { AccessDeniedLoader } from '$lib/components/layout';

	interface Props {
		event: PublicPost;
	}

	let { event }: Props = $props();
	const modalManager = getModalManager();
	const jamAttendance = jamAttendanceStore(event?.data?.type === 'event' ? event.id || '' : '');
</script>

<ModalWrapper extraClassNames="md:w-1/3 ">
	<ModalHeader title="Jam Attendance" />
	<article class="max-h-[60vh] overflow-y-scroll">
		<AccessDeniedLoader queries={[$jamAttendance]}>
			{#if $jamAttendance?.data}
				<ul class="space-y-2">
					{#each $jamAttendance.data as attendee (attendee.id)}
						<ProfileFromId profileId={attendee.profileId} avatarSize={2} >
							{#snippet action()}
								<div class=""></div>
							{/snippet}
						</ProfileFromId>
					{/each}
				</ul>
			{:else}
				<p>No one has joined yet</p>
			{/if}
		</AccessDeniedLoader>
	</article>

	<ModalFooter>
		<Button title="Close" variant="variant-filled-primary" action={modalManager.close}>Close</Button
		>
	</ModalFooter>
</ModalWrapper>
