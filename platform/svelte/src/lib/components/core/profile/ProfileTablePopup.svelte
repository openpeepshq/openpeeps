<script lang="ts">
	import { Pencil, Trash } from 'lucide-svelte';

	import DeleteProfileModal from './modals/DeleteProfileModal.svelte';
	import type { PublicProfile } from '@openpeeps/common/types';
	import EditProfileModal from './modals/EditProfileModal.svelte';
	import { EditEmailModal } from '../accounts';
	import {
		PopupMenu,
		PopupMenuButton,
		PopupSection,
		PopupSeparator,
		getModalManager
	} from '@openpeeps/ui';
	import { UpdatingDate } from '@openpeeps/ui';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		profile: PublicProfile;
	}

	let { profile }: Props = $props();
	const modalManager = getModalManager();

	const handleTriggerEditRoles = () => modalManager.show(EditProfileModal, { profile });

	const handleTriggerDeleteMember = () => modalManager.show(DeleteProfileModal, { profile });

	const handleTriggerEditEmail = () => modalManager.show(EditEmailModal, { profile });
</script>

<PopupMenu menuId="account-table-popup-{profile.id}">
	<div class="space-y-4 p-2">
		<div class="flex items-center justify-between">
			<span>{t('profile.table.dateJoined')}</span>
			<span><UpdatingDate date={profile.createdAt} /></span>
		</div>
		<div class="flex items-center justify-between">
			<span>{t('profile.table.invitedBy')}</span>
			<span>-</span>
		</div>
		<div class="flex items-center justify-between">
			<span>{t('profile.table.emailVerified')}</span>
			<span>{profile.controllers?.[0]?.emailValidated ? '✅' : '❌'}</span>
		</div>
	</div>
	<PopupSeparator />
	<PopupSection title={t('profile.table.actions')} />
	<PopupMenuButton
		title={t('profile.table.editEmail')}
		icon={Pencil}
		text={t('profile.table.editEmail')}
		action={handleTriggerEditEmail}
	/>
	<PopupMenuButton
		title={t('profile.table.editRoles')}
		icon={Pencil}
		text={t('profile.table.editRoles')}
		action={handleTriggerEditRoles}
	/>
	<PopupMenuButton
		title={t('profile.table.deleteMember')}
		icon={Trash}
		text={t('profile.table.delete')}
		action={handleTriggerDeleteMember}
		danger={true}
	/>
</PopupMenu>
