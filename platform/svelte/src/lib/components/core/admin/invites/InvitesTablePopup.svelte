<script lang="ts">
	import { Users, Pencil, X, CheckCheck, Copy } from 'lucide-svelte';
	import ListOfInvitedMembers from './ListOfInvitedMembers.svelte';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { activateInviteLinkMutation, deactivateInviteLinkMutation } from '$lib/api';
	import type { InviteLinkWithMeta } from '@openpeeps/common/types';
	import { toast } from '$lib/utils/toast';
	import { getModalManager } from '@openpeeps/ui';
	import { PopupMenu, PopupMenuButton } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		inviteLink: InviteLinkWithMeta;
	}

	let { inviteLink = $bindable() }: Props = $props();
	const toastStore = getToastStore();
	const modalManager = getModalManager();

	const activateInviteLink = activateInviteLinkMutation({
		id: inviteLink.id
	});
	const deactivateInviteLink = deactivateInviteLinkMutation({
		id: inviteLink.id
	});
</script>

<PopupMenu menuId={inviteLink.id}>
	<PopupMenuButton
		title={t('admin.invites.seeInvitedAccounts')}
		icon={Users}
		text={t('admin.invites.seeInvitedAccounts')}
		action={() => modalManager.show(ListOfInvitedMembers, { inviteDetails: inviteLink })}
	/>
	{#if inviteLink.active && new Date(inviteLink.expiresAt) > new Date()}
		<PopupMenuButton
			title={t('admin.invites.copyLink')}
			icon={Copy}
			text={t('admin.invites.copyLink')}
			action={() => {
				navigator.clipboard.writeText(
					location.toString().replace(location.pathname, '/auth/register/invitation') +
						`?inviteCode=${inviteLink.slug}`
				);
				toastStore.trigger(
					toast({
						message: t('admin.invites.copiedToClipboard'),
						background: 'variant-filled-success'
					})
				);
			}}
		/>
		<PopupMenuButton
			title={t('admin.invites.deactivate')}
			icon={X}
			text={t('admin.invites.deactivate')}
			action={() => {
				deactivateInviteLink()
					.then(() => {
						if (!inviteLink) return;
						inviteLink = { ...inviteLink, active: false };
						toastStore.trigger(
							toast({
								message: t('admin.invites.deactivateSuccess'),
								background: 'variant-filled-success'
							})
						);
					})
					.catch(() => {
						toastStore.trigger(
							toast({
								message: t('admin.invites.deactivateError'),
								background: 'variant-filled-error'
							})
						);
					});
			}}
		/>
	{:else}
		{#if new Date(inviteLink.expiresAt) > new Date()}
			<PopupMenuButton
				title={t('admin.invites.activate')}
				icon={CheckCheck}
				text={t('admin.invites.activate')}
				action={() => {
					activateInviteLink()
						.then(() => {
							if (!inviteLink) return;
							inviteLink = { ...inviteLink, active: true };
							toastStore.trigger(
								toast({
									message: t('admin.invites.activateSuccess'),
									background: 'variant-filled-success'
								})
							);
						})
						.catch(() => {
							toastStore.trigger(
								toast({
									message: t('admin.invites.activateError'),
									background: 'variant-filled-error'
								})
							);
						});
				}}
			/>
		{/if}
	{/if}
</PopupMenu>
