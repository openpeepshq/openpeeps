<script lang="ts">
	import { page } from '$app/state';
	import { me, repostMutation } from '$lib/api';
	import type { PublicPost } from '@openpeeps/common/types';
	import { Repeat, Send, Copy, Share } from 'lucide-svelte';
	import {
		PopupMenu,
		PopupMenuButton,
		PopupSection,
		PopupSeparator,
		getModalManager,
		type IconType,
		type Variant
	} from '@openpeeps/ui';
	import { CreateNewConversation } from '$lib/components';
	import type { Snippet } from 'svelte';

	const modalManager = getModalManager();

	interface Props {
		post: PublicPost;
		variant?: Variant;
		class?: string;
		icon?: IconType;
		menuButton?: Snippet;
	}

	let { post, menuButton, variant, class: additionalClasses, icon = Share }: Props = $props();

	const repost = repostMutation({ id: post.id });
</script>

<PopupMenu menuId="share-menu-{post.id}" {icon} {menuButton} {variant} class={additionalClasses}>
	{#if $me}
		<PopupSection title="Share on Community" />
		<PopupMenuButton
			title="Repost to feed"
			action={repost}
			text="Repost to feed"
			loadingText="reposting..."
			icon={Repeat}
		/>
		<PopupMenuButton
			title="Direct message"
			action={() =>
				modalManager.show(CreateNewConversation, {
					message: `${page.url.origin}/posts/${post.id}`
				})}
			text="Send in a message"
			icon={Send}
		/>
		<PopupSeparator />
		<PopupSection title="Other options" />
	{/if}
	<PopupMenuButton
		title="Copy link"
		action={() => navigator.clipboard.writeText(`${page.url.origin}/posts/${post.id}`)}
		text="Copy link"
		icon={Copy}
	/>
</PopupMenu>
