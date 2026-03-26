<script lang="ts">
	import type { ExpandedNotification } from '@openpeeps/common/types';
	import { profileName } from '@openpeeps/common/lib';
	import { UpdatingDate } from '@openpeeps/ui';
	import NotificationWrapper from '../NotificationWrapper.svelte';
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
		<div class="flex items-center gap-1">
			<p class="flex items-center gap-2 text-base">
				{t('notification.follow.text', { profileName: profileName(profile) })}
			</p>
			<span class="ml-1 text-sm"><UpdatingDate date={notification.createdAt} /></span>
		</div>
	</div>
</NotificationWrapper>
