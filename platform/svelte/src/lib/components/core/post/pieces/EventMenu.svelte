<script lang="ts">
	import { me } from '$lib/api';
	import type { PublicPost } from '@openpeeps/common/types';
	import { CopyPlusIcon, Pencil } from 'lucide-svelte';
	import { PopupMenu, PopupMenuButton, type Variant } from '@openpeeps/ui';
	import type { Snippet } from 'svelte';
	import { i18nContext } from '$lib/components/i18n';
	import { goto } from '$app/navigation';
	import { getNewPostStores } from '$lib/stores';

	const { t } = i18nContext();
	interface Props {
		post: PublicPost;
		menuButton?: Snippet;
		variant?: Variant;
		class?: string;
	}
	const newPostStores = getNewPostStores();

	let { post, menuButton, variant, class: additionalClasses }: Props = $props();
</script>

<PopupMenu menuId="event-menu-{post.id}" {menuButton} {variant} class={additionalClasses}>
	{#if $me?.id === post.profile.id}
		<PopupMenuButton
			title={t('common.actions.edit')}
			action="/events/{post.id}/edit"
			text={t('common.actions.edit')}
			icon={Pencil}
		/>
		<PopupMenuButton
			title={t('common.actions.duplicate')}
			action={async () => {
				newPostStores.event = {
					data:{
						...post.data,
						content : post.data.content,
					},
					mentions: post.mentions,
					visibility:post.visibility,
					audience: post.audience,
					groupId: post.groupId,
					type:"event"
					
				}
				await goto("/events/new")
			}}
			text={t('common.actions.duplicate')}
			icon={CopyPlusIcon}
		/>
	{/if}
</PopupMenu>
