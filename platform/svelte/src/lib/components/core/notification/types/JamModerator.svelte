<script lang="ts">
	import type { Event, ExpandedNotification } from '@openpeeps/common/types';
	import { profileName } from '@openpeeps/common/lib';
	import { UpdatingDate } from '@openpeeps/ui';
	import NotificationWrapper from '../NotificationWrapper.svelte';
	import CardEvent from '../../post/types/event/CardEvent.svelte';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		notification: ExpandedNotification;
	}

	let { notification }: Props = $props();
	const { t } = i18nContext();

	const profile = notification.senderProfile!;
</script>

<NotificationWrapper {profile} seen={notification.seen}>
	<div class="w-full px-4">
		<div class="flex w-full items-center justify-between">
			<p class="mb-2 flex items-center gap-2 text-sm font-semibold">
				{t('notification.jamModerator.text', {
					profileName: profileName(profile)
				})}
				<UpdatingDate date={notification.createdAt} />
			</p>
		</div>
		<CardEvent post={notification.post!} />
	</div>
</NotificationWrapper>
