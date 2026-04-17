<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { ModalFooter, ModalHeader } from '@openpeeps/ui';
	import type { GroupData } from '@openpeeps/common/types';
	import { Bell, BellDot, BellOff } from 'lucide-svelte';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		group?: GroupData | undefined;
	}

	let { group = undefined }: Props = $props();
	let notificationValue = $state('');
	const notificationOptions = $derived([
		{
			icon: Bell,
			label: t('groups.modals.manageNotifications.options.all'),
			description: '',
			value: 'all'
		},
		{
			icon: BellDot,
			label: t('groups.modals.manageNotifications.options.mostRelevant'),
			description: t('groups.modals.manageNotifications.options.mostRelevantDescription'),
			value: 'most-relevant'
		},
		{
			icon: BellOff,
			label: t('groups.modals.manageNotifications.options.off'),
			description: '',
			value: 'off'
		}
	]);
</script>

<div class="bg-surface-100-800-token mx-auto rounded-lg shadow-md md:w-1/3">
	<ModalHeader title={t('groups.modals.manageNotifications.title')} />
	<article class="space-y-2 p-3">
		<p>{t('groups.modals.manageNotifications.description', { groupName: group?.displayName ?? '' })}</p>

		<div class="pl-2">
			{#each notificationOptions as notificationOption}
				{@const NotificationIcon = notificationOption.icon}
				<div class="mb-2 flex w-full items-center justify-between gap-2">
					<div class="flex items-center space-x-2">
						<NotificationIcon />
						<label for={notificationOption.value}>
							<span>{notificationOption.label}</span>
							<span>{notificationOption.description}</span>
						</label>
					</div>
					<input
						bind:group={notificationValue}
						type="radio"
						id={notificationOption.value}
						name="notification"
						value={notificationOption.value}
					/>
				</div>
			{/each}
		</div>
	</article>

	<ModalFooter extraClassNames="flex justify-end w-full">
		<div class=""></div>
		<Button title={t('common.done')} variant="variant-filled-primary">{t('common.done')}</Button>
	</ModalFooter>
</div>
