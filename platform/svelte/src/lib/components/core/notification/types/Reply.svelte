<script lang="ts">
	import { FeedPost } from '$lib/components/core/post';
	import { Reply } from 'lucide-svelte';
	import type { ExpandedNotification, PublicPost } from '@openpeeps/common/types';
	import { profileName } from '@openpeeps/common/lib';
	import NotificationWrapper from '../NotificationWrapper.svelte';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		notification: ExpandedNotification;
	}

	let { notification }: Props = $props();
	const { t } = i18nContext();

	const { replyPost } = notification.data as { replyPost: PublicPost };
	const profile = notification.senderProfile!;
</script>

<NotificationWrapper {profile} seen={notification.seen} showProfile={false}>
	<a class="w-full px-4" href="/posts/{replyPost.id}">
		<div class="flex w-full items-center justify-between">
			<p class="mb-2 flex items-center gap-2 text-sm font-semibold">
				<Reply size={16} />
				{t('notification.reply.text', {
					profileName: profileName(profile)
				})}
			</p>
		</div>

		{#if replyPost}
			<FeedPost post={replyPost} />
		{/if}
	</a>
</NotificationWrapper>
