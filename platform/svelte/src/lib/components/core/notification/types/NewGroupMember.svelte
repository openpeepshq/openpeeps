<script lang="ts">
	import type { ExpandedNotification, GroupWithMeta } from '@openpeeps/common/types';
	import { profileName } from '@openpeeps/common/lib';
	import { UpdatingDate } from '@openpeeps/ui';
	import { Users } from 'lucide-svelte';
	import GroupAvatar from '../../groups/GroupAvatar.svelte';
	import NotificationWrapper from '../NotificationWrapper.svelte';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		notification: ExpandedNotification;
	}

	let { notification }: Props = $props();
	const { t } = i18nContext();

	const profile = notification.senderProfile!;
	const group = notification.group as GroupWithMeta;
</script>

<NotificationWrapper {profile} showProfile={false} seen={notification.seen}>
	<div class="w-full px-4 py-2">
		<div class="flex items-center gap-x-4">
			<Users class="h-8 w-8 text-surface-500" />
			<GroupAvatar {group} size={4} />
		</div>
		<span class="py-2">
			{t('notification.newGroupMember.text', {
				profileName: profileName(profile)
			})}{' '}
			<strong>
				<a href={`/groups/@${group.handle}`}>{group.displayName}</a>
			</strong>
			<span class="ml-2">
				<UpdatingDate date={notification.createdAt} />
			</span>
		</span>
	</div>
</NotificationWrapper>
