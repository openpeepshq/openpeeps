<script lang="ts">
	import { MessageSquare } from 'lucide-svelte';
	import type { ExpandedNotification, PublicPost } from '@openpeeps/common/types';
	import { profileName } from '@openpeeps/common/lib';
	import { Message } from '$lib/components/core/conversations';
	import { UpdatingDate } from '@openpeeps/ui';
	import NotificationWrapper from '../NotificationWrapper.svelte';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		notification: ExpandedNotification;
	}

	let { notification }: Props = $props();
	const { t } = i18nContext();

	const { conversationStart } = notification.data as {
		conversationStart: PublicPost;
	};
</script>

<NotificationWrapper profile={notification.senderProfile!} seen={notification.seen}>
	<a class="w-full px-4" href="/conversations/{conversationStart?.id}">
		<div class="flex w-full items-center justify-between">
			<p class="flex items-center gap-2 text-sm font-semibold">
				<MessageSquare size={16} />
				{t('notification.directMessage.text', {
					profileName: profileName(notification.senderProfile!)
				})}
			</p>
		</div>
		{#if notification.post}
			<Message message={notification.post} />
			<div class="mt-2 text-xs">
				<UpdatingDate date={notification.post.createdAt} />
			</div>
		{/if}
	</a>
</NotificationWrapper>
