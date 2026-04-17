<script lang="ts">
	import {
		getModalManager,
		PopupMenu,
		PopupMenuButton,
		PopupSection,
		PopupSeparator
	} from '@openpeeps/ui';
	import { Link, Pencil, Share } from 'lucide-svelte';
	import { toast } from '$lib/utils/toast';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { NewPostModal } from '$lib/components/core/post';
	import { postDataStore, resetNewPostData } from '$lib/components/core/post/post-form/stores';
	import { page } from '$app/state';
	import { CreateNewConversation } from '$lib/components/core/conversations';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const toastStore = getToastStore();
	const modalManager = getModalManager();
</script>

<PopupMenu menuId="groupShareFeatures" icon={Share}>
	<PopupSection title={t('groups.actions.shareOnCommunity')} />
	<PopupMenuButton
		action={() => {
			postDataStore.set({
				...$postDataStore.data,
				visibility: 'public',
				data: {
					type: 'note',
					content: t('groups.share.inviteBlurb', { url: page.url })
				}
			});
			modalManager.show(NewPostModal, {});
		}}
		title={t('groups.actions.shareToFeed')}
		text={t('groups.share.postToFeed')}
		icon={Pencil}
	/>
	<PopupMenuButton
		title={t('groups.actions.shareInMessage')}
		text={t('groups.share.sendInMessage')}
		icon={Pencil}
		action={() => {
			modalManager.show(CreateNewConversation, {
				message: t('groups.share.inviteBlurb', { url: page.url })
			});
		}}
	/>
	<PopupSection title={t('groups.actions.otherOptions')} />
	<PopupMenuButton
		text={t('groups.share.copyLink')}
		icon={Link}
		action={() => {
			navigator.clipboard.writeText(location.toString());
			toastStore.trigger(
				toast({
					message: t('groups.share.linkCopied'),
					background: 'variant-filled-success'
				})
			);
		}}
	/>
</PopupMenu>
