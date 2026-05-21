<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import type { PublicProfile } from '@openpeeps/common/types';
	import { FollowUnfollowButton } from '$lib/components/core/profile';
	import { me } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';
	import { PopupMenu, PopupMenuButton, getModalManager } from '@openpeeps/ui';
	import ReportProfileOrPostModal from '$lib/components/core/profile/modals/ReportProfileOrPostModal.svelte';
	import { FlagIcon, Copy, MessageSquareText } from 'lucide-svelte';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';
	import { CreateNewConversation } from '../../conversations';
  import { canCreatePost } from '@openpeeps/common';
  import { getCurrentAuthData } from '$lib/auth';

	const { t } = i18nContext();

	interface Props {
		profile: PublicProfile;
		isCurrentProfile?: boolean;
	}

	const modalManager = getModalManager();
	const toastStore = getToastStore();

	let { profile, isCurrentProfile = false }: Props = $props();

	const authData = getCurrentAuthData();
</script>

<div class="mt-2 flex h-6 items-center justify-end gap-x-2 pr-2 pt-3">
	{#if isCurrentProfile}
		<Button
			title={t('profile.edit.title')}
			action="/settings/public-profile"
			variant="variant-ringed-surface"
		>
			{t('profile.edit.title')}
		</Button>
	{:else if $me}
		<PopupMenu class="h-max rounded-full hover:bg-surface-200" menuId="post-menu-{profile.id}">
			<PopupMenuButton
				title={t('profile.actions.copyProfileLink')}
				action={() => {
					navigator.clipboard.writeText(location.toString());
					toastStore.trigger(
						toast({
							message: t('profile.copyProfileLink.success'),
							background: 'variant-filled-success'
						})
					);
				}}
				icon={Copy}
				text={t('profile.actions.copyProfileLink')}
			/>
			<PopupMenuButton
				title={t('common.actions.reportProfile', {
					handle: profile.handle
				})}
				action={() =>
					modalManager.show(ReportProfileOrPostModal, { profile: profile, reportType: 'profile' })}
				icon={FlagIcon}
				text={t('common.actions.reportProfile', {
					handle: profile.handle
				})}
				danger
			/>
		</PopupMenu>
		{#if canCreatePost(authData, 'note', 'direct')}
			<Button
				title={t('conversations.newMessage')}
				action={() => modalManager.show(CreateNewConversation, {profiles: [profile], skipProfileSelection: true})}
				variant="variant-ringed-surface"
			>
				<MessageSquareText size={20}/>
			</Button>
		{/if}
		<FollowUnfollowButton {profile} />
	{/if}
</div>
