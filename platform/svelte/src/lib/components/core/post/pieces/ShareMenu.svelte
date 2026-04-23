<script lang="ts">
	import { page } from '$app/state';
	import { me, repostMutation } from '$lib/api';
	import type { Event, PublicPost } from '@openpeeps/common/types';
	import { buildEventIcs } from '@openpeeps/common/lib';
	import { Repeat, Send, Copy, Share, Calendar } from 'lucide-svelte';
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

	const downloadEventIcs = async () => {
		const postUrl = `${page.url.origin}/posts/${post.id}`;
		const ics = buildEventIcs(post, { postUrl });
		if (!ics) return;
		const event = post.data as Event;
		const raw = event.name?.trim() || `event-${post.id}`;
		const safe = raw.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 100);
		const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
		const href = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = href;
		a.download = `${safe}.ics`;
		a.click();
		URL.revokeObjectURL(href);
	}
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
	{#if post.type === 'event'}
		<PopupMenuButton
			title={t('posts.shareMenu.downloadCalendarIcsTitle')}
			action={downloadEventIcs}
			text={t('posts.shareMenu.downloadCalendarIcs')}
			icon={Calendar}
		/>
	{/if}
	<PopupMenuButton
		title={t('posts.shareMenu.copyLink')}
		action={() => navigator.clipboard.writeText(`${page.url.origin}/posts/${post.id}`)}
		text={t('posts.shareMenu.copyLink')}
		icon={Copy}
	/>
</PopupMenu>
