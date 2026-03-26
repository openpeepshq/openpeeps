<script lang="ts">
	import { me } from '$lib/api';
	import { getModalManager, stopPropagation } from '@openpeeps/ui';
	import { Avatar } from '../profile';
	import type { PublicPost } from '@openpeeps/common';
	import { ReplyModal } from '.';
	import { Image } from 'lucide-svelte';
	import { SignUpLoginModal } from '../accounts';

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
		title="Reply"
		onclick={stopPropagation(handleTriggerReplyModal)}
		class="flex w-full items-center gap-x-2 border-b-2 p-5"
	>
		<Avatar profile={$me} borderless />
		<span
			class="bg-surface-200 hover:bg-surface-300 flex h-max w-full rounded-full border-b border-t p-5"
		>
			<span>Add a reply...</span>
			<Image size={24} />
		</span>
	</button>
{:else}
	<button
		title="Log in to reply"
		onclick={stopPropagation(() => modalManager.show(SignUpLoginModal, {}))}
		class="flex w-full items-center gap-x-2 border-b-2 p-5"
	>
		<Avatar profile={$me} borderless />
		<span
			class="bg-surface-200 hover:bg-surface-300 flex h-max w-full rounded-full border-b border-t p-5"
		>
			<span>Add a reply...</span>
			<Image size={24} />
		</span>
	</button>
{/if}
