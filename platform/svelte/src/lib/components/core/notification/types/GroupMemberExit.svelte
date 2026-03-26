<script lang="ts">
	import type { ExpandedNotification, GroupWithMeta } from '@openpeeps/common/types';
	import { profileName } from '@openpeeps/common/lib';
	import { UpdatingDate } from '@openpeeps/ui';
	import { Users } from 'lucide-svelte';
	import GroupAvatar from '../../groups/GroupAvatar.svelte';
	import NotificationWrapper from '../NotificationWrapper.svelte';

	interface Props {
		notification: ExpandedNotification;
	}

	let { notification }: Props = $props();

	const profile = notification.senderProfile!;
	const group = notification.group as GroupWithMeta;
</script>

<NotificationWrapper {profile} seen={notification.seen} showProfile={false}>
	<div class="w-full px-4">
		<div class="flex items-center gap-x-4">
			<Users class="text-surface-500 h-8 w-8" />
			<GroupAvatar {group} size={8} />
		</div>
		<span class="mt-2">
			{profileName(profile)} left
			<strong>
				<a href={`/groups/@${group.handle}`}>{group.displayName}</a>
			</strong>
			<span class="ml-2">
				<UpdatingDate date={notification.createdAt} />
			</span>
		</span>
	</div>
</NotificationWrapper>
