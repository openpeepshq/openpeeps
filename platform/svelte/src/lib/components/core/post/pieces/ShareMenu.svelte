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
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
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
		<PopupSection title={t('posts.shareMenu.shareOnCommunity')} />
		<PopupMenuButton
			title={t('posts.shareMenu.repostToFeed')}
			action={repost}
			text={t('posts.shareMenu.repostToFeed')}
			loadingText={t('posts.shareMenu.reposting')}
			icon={Repeat}
		/>
		<PopupMenuButton
			title={t('posts.shareMenu.directMessage')}
			action={() =>
				modalManager.show(CreateNewConversation, {
					message: `${page.url.origin}/posts/${post.id}`
				})}
			text={t('posts.shareMenu.sendInMessage')}
			icon={Send}
		/>
		<PopupSeparator />
		<PopupSection title={t('posts.shareMenu.otherOptions')} />
	{/if}
	<PopupMenuButton
		title={t('posts.shareMenu.copyLink')}
		action={() => navigator.clipboard.writeText(`${page.url.origin}/posts/${post.id}`)}
		text={t('posts.shareMenu.copyLink')}
		icon={Copy}
	/>
</PopupMenu>
