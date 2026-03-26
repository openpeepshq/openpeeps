<script lang="ts">
	import { getModalStore, type ModalSettings } from '@skeletonlabs/skeleton';
	import InviteWithEmail from './InviteWithEmail.svelte';
	import InviteWithLink from './InviteWithLink.svelte';
	import { PopupMenu, PopupMenuButton } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	const modalStore = getModalStore();

	export const inviteMemberWithEmailModal: ModalSettings = {
		type: 'component',
		component: {
			ref: InviteWithEmail
		}
	};

	export const inviteMemberWithLinkModal: ModalSettings = {
		type: 'component',
		component: {
			ref: InviteWithLink
		}
	};
</script>

<PopupMenu menuId="invitePagePopupFeatures">
	<PopupMenuButton
		title={t('admin.members.inviteWithEmailTitle')}
		text={t('admin.members.inviteWithLinkTitle')}
		action={() => modalStore.trigger(inviteMemberWithLinkModal)}
	/>
</PopupMenu>
