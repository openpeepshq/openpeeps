<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';
	import {
		Button,
		ModalHeader,
		ModalFooter,
		ModalWrapper,
		getModalManager,
		PopupMenu
	} from '@openpeeps/ui';
	import type { PublicProfile, PublicPost } from '@openpeeps/common/types';
	import CreateNewJam from './CreateNewJam.svelte';
	import { Timer } from 'lucide-svelte';
	import { page } from '$app/state';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		audience: PublicProfile[];
		doCreateJam: (
			date?: string,
			audience?: PublicPost['audience'],
			url?: string
		) => Promise<PublicPost>;
	}

	const toastStore = getToastStore();

	const modalManager = getModalManager();
	let { audience, doCreateJam }: Props = $props();
	let date: Date | undefined = $state();
	let time: string | undefined = $state();

	const handleSave = async () => {
		await doCreateJam(new Date(`${date}T${time}`).toISOString(), audience, page.url.origin);
		toastStore.trigger(
			toast({
				message: t('jams.scheduler.eventCreatedSuccess'),
				background: 'variant-filled-success',
				autohide: true
			})
		);
		modalManager.close();
	};

	const handleCancel = () => {
		modalManager.close();
		modalManager.show(CreateNewJam);
	};

	const generateTimeSlots = () =>
		Array.from({ length: 96 }, (_, i) => {
			const hour = Math.floor(i / 4)
				.toString()
				.padStart(2, '0');
			const minute = ((i % 4) * 15).toString().padStart(2, '0');
			return `${hour}:${minute}`;
		});
	const timeSlots = generateTimeSlots();

	const formatTime = (time: string) => {
		const [hours, minutes] = time.split(':');
		const period = Number(hours) >= 12 ? 'PM' : 'AM';
		const formattedHours = Number(hours) % 12 || 12;
		return `${formattedHours}:${minutes} ${period}`;
	};
</script>

<ModalWrapper>
	<!-- header -->
	<ModalHeader title={t('jams.scheduler.scheduleForLater')} />
	<!-- content -->
	<div class="mb-4 h-2/3 px-4 pt-2">
		<h4 class="mb-2">{t('jams.scheduler.pickDateTime')}</h4>

		<!-- date -->
		<div class="mb-4">
			<h4>{t('jams.scheduler.dateLabel')}</h4>
			<input
				bind:value={date}
				type="date"
				class="bg-surface-300 w-full rounded-md border border-neutral-500 p-2 text-center"
				min={new Date().toISOString().split('T')[0]}
			/>
		</div>

		<!-- time -->
		<div class="mb-4">
			<h4>{t('jams.scheduler.timeLabel')}</h4>
			<PopupMenu
				text={time ? formatTime(time) : t('jams.scheduler.selectTime')}
				class="bg-surface-200 h-max w-full rounded-md py-2"
				menuId="jam-scheduler-menu-time-slots"
				icon={Timer}
				placement="bottom-start"
				width="w-full max-w-[610px]"
			>
				<div class="h-40 overflow-y-auto">
					{#each timeSlots as slot}
						<Button
							class="hover:bg-surface-300 w-full rounded-md py-2 text-left {time === slot
								? 'bg-surface-300 text-primary-500'
								: ''}"
							action={() => {
								time = slot;
							}}
						>
							{formatTime(slot)}
						</Button>
					{/each}
				</div>
			</PopupMenu>
		</div>
	</div>

	<!-- footer -->
	<ModalFooter extraClassNames={'gap-x-4 shadow-md'}>
		<div class="flex w-full justify-end gap-4">
			<Button action={handleCancel} variant="variant-ringed-surface">{t('jams.scheduler.back')}</Button>
			<Button action={handleSave} disabled={!date || !time} variant="variant-filled-primary">
				{t('jams.scheduler.save')}
			</Button>
		</div>
	</ModalFooter>
</ModalWrapper>
