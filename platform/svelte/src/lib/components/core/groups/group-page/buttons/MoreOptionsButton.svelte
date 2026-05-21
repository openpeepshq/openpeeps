<script lang="ts">
  import { getModalManager, PopupMenu, PopupMenuButton } from '@openpeeps/ui';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import {
    LogOut,
    Ellipsis,
    Pencil,
    Trash,
    UserPlus,
  } from 'lucide-svelte';
  import { groupMembersStore, me } from '$lib/api';
  import DeleteGroupModal from '../../pieces/modals/DeleteGroupModal.svelte';
  import { goto } from '$app/navigation';
  import ConfirmGroupExitModal from '../../pieces/modals/ConfirmGroupExitModal.svelte';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '$lib/utils';
  import AddMemberModal from '../../pieces/modals/AddMemberModal.svelte';
  import { i18nContext } from '$lib/components/i18n';
  import { checkGroupCapabilities } from '@openpeeps/common';
  import { getCurrentAuthData } from '$lib/auth';

  const { t } = i18nContext();
  const authData = getCurrentAuthData();

  const modalManager = getModalManager();

  interface Props {
    group: GroupWithMeta;
  }

  let { group }: Props = $props();
  const toastStore = getToastStore();
  const membersQuery = groupMembersStore(group.id);

  let members = $derived($membersQuery.data || []);

  const handleLeaveGroup = () => {
    if (
      $me?.memberships
        ?.find((m) => m.group.id === group.id)
        ?.roles?.includes('admin') &&
      members?.filter((m) => m?.roles?.includes('admin')).length === 1
    ) {
      toastStore.trigger(
        toast({
          message: t('groups.leave.lastAdminError'),
          background: 'variant-filled-danger',
        }),
      );
    }

    modalManager.show(ConfirmGroupExitModal, { group: group, profile: $me });
  };
</script>

<PopupMenu menuId="groupMoreOptionsFeatures" icon={Ellipsis}>
  {#if checkGroupCapabilities(authData, ['core-groups-update'], group).success}
    <PopupMenuButton
      title={t('groups.actions.editGroup')}
      text={t('groups.actions.editGroup')}
      icon={Pencil}
      action={() => {
        goto(`/groups/@${group.handle}/edit`);
      }}
    />
  {/if}
  {#if checkGroupCapabilities(authData, ['core-groups-addMember'], group).success}
    <PopupMenuButton
      title={t('groups.actions.addMembers')}
      text={t('groups.actions.addMembers')}
      icon={UserPlus}
      action={() => {
        modalManager.show(AddMemberModal, { group });
      }}
    />
  {/if}
  <PopupMenuButton
    title={t('groups.actions.leaveGroup')}
    text={t('groups.actions.leaveGroup')}
    icon={LogOut}
    action={handleLeaveGroup}
  />
  <!--PopupMenuButton text="Report group" icon={Flag} action={() => {}} /-->
  {#if checkGroupCapabilities(authData, ['core-groups-delete'], group).success}
    <PopupMenuButton
      title={t('groups.delete.title')}
      text={t('groups.delete.title')}
      icon={Trash}
      action={() =>
        modalManager.show(DeleteGroupModal, {
          group,
          callback: () => {
            window.history.back();
          },
        })}
      danger={true}
    />
  {/if}
</PopupMenu>
