<script lang="ts">
	import { Button } from '@openpeeps/ui';

	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import type { PublicPost } from '@openpeeps/common/types';
	import { jamAttendanceStore } from '$lib/api';
	import { ProfileFromId } from '../../profile';
	import { AccessDeniedLoader } from '$lib/components/layout';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		event: PublicPost;
	}

	let { event }: Props = $props();
	const modalManager = getModalManager();
	const jamAttendance = jamAttendanceStore(event?.data?.type === 'event' ? event.id || '' : '');
</script>

<ModalWrapper extraClassNames="md:w-1/3 ">
	<ModalHeader title={t('jams.modals.attendance.title')} />
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
				<p>{t('jams.modals.attendance.empty')}</p>
			{/if}
		</AccessDeniedLoader>
	</article>

	<ModalFooter>
		<Button title={t('jams.modals.attendance.close')} variant="variant-filled-primary" action={modalManager.close}>{t('jams.modals.attendance.close')}</Button
		>
	</ModalFooter>
</ModalWrapper>
