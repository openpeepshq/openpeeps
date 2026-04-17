<script lang="ts">
	import { me } from '$lib/api';
	import { getModalManager, stopPropagation } from '@openpeeps/ui';
	import { Avatar } from '../profile';
	import type { PublicPost } from '@openpeeps/common';
	import { ReplyModal } from '.';
	import { Image } from 'lucide-svelte';
	import { SignUpLoginModal } from '../accounts';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const modalManager = getModalManager();

	interface Props {
		post?: PublicPost;
	}

	let { post }: Props = $props();

	const handleTriggerReplyModal = () => {
		if (post) {
			modalManager.show(ReplyModal, {
				inReplyTo: post
			});
		}
	};
</script>

{#if $me}
	<button
		title={t('posts.replyBox.reply')}
		onclick={stopPropagation(handleTriggerReplyModal)}
		class="flex w-full items-center gap-x-2 border-b-2 p-5"
	>
		<Avatar profile={$me} borderless />
		<span
			class="bg-surface-200 hover:bg-surface-300 flex h-max w-full rounded-full border-b border-t p-5"
		>
			<span>{t('posts.replyBox.addReplyPlaceholder')}</span>
			<Image size={24} />
		</span>
	</button>
{:else}
	<button
		title={t('posts.replyBox.logInToReply')}
		onclick={stopPropagation(() => modalManager.show(SignUpLoginModal, {}))}
		class="flex w-full items-center gap-x-2 border-b-2 p-5"
	>
		<Avatar profile={$me} borderless />
		<span
			class="bg-surface-200 hover:bg-surface-300 flex h-max w-full rounded-full border-b border-t p-5"
		>
			<span>{t('posts.replyBox.addReplyPlaceholder')}</span>
			<Image size={24} />
		</span>
	</button>
{/if}
