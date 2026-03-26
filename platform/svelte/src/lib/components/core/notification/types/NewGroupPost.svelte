<script lang="ts">
	import { FeedPost } from '$lib/components/core/post';
	import { Users } from 'lucide-svelte';
	import type { ExpandedNotification } from '@openpeeps/common/types';
	import { groupName } from '@openpeeps/common/lib';
	import NotificationWrapper from '../NotificationWrapper.svelte';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		notification: ExpandedNotification;
	}

	let { notification }: Props = $props();

	const { t } = i18nContext();

	const post = notification.post!;
	const profile = notification.senderProfile!;
	const group = post.group!;
</script>

<NotificationWrapper {profile} seen={notification.seen} showProfile={false}>
	<a class="w-full px-4" href="/posts/{post.id}">
		<div class="flex w-full items-center justify-between">
			<p class="mb-2 flex items-center gap-2 text-sm font-semibold">
				<Users size={16} />
				{t('notification.newGroupPost.text', {
					groupName: groupName(group)
				})}
			</p>
		</div>

		{#if post}
			<FeedPost {post} inGroup />
		{/if}
	</a>
</NotificationWrapper>
