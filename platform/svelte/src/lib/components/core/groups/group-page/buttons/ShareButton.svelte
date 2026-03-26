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

	const toastStore = getToastStore();
	const modalManager = getModalManager();
</script>

<PopupMenu menuId="groupShareFeatures" icon={Share}>
	<PopupSection title="Share on community" />
	<PopupMenuButton
		action={() => {
			postDataStore.set({
				...$postDataStore.data,
				visibility: 'public',
				data: {
					type: 'note',
					content: `Join our group for exclusive updates and great conversations! ${page.url}`
				}
			});
			modalManager.show(NewPostModal, {});
		}}
		title="Share to feed"
		text="Post to feed"
		icon={Pencil}
	/>
	<PopupMenuButton
		title="Share in a message"
		text="Send in a message"
		icon={Pencil}
		action={() => {
			modalManager.show(CreateNewConversation, {
				message: `Join our group for exclusive updates and great conversations! ${page.url}`
			});
		}}
	/>
	<PopupSection title="Other options" />
	<PopupMenuButton
		text="Copy link"
		icon={Link}
		action={() => {
			navigator.clipboard.writeText(location.toString());
			toastStore.trigger(
				toast({
					message: 'Group link copied',
					background: 'variant-filled-success'
				})
			);
		}}
	/>
</PopupMenu>
