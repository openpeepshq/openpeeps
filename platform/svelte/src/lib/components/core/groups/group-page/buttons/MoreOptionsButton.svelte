<script lang="ts">
  import { getModalManager, PopupMenu, PopupMenuButton } from '@openpeeps/ui';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import {
    LogOut,
    MoreHorizontal,
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

  const { t } = i18nContext();

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
      $me.memberships
        ?.find((m) => m.group.id === group.id)
        ?.roles.includes('admin') &&
      members?.filter((m) => m.roles.includes('admin')).length === 1
    ) {
      toastStore.trigger(
        toast({
          message:
            'You are the last admin in this group. Please assign a new admin before leaving.',
          background: 'variant-filled-danger',
        }),
      );
    }

    modalManager.show(ConfirmGroupExitModal, { group: group, profile: $me });
  };
</script>

<PopupMenu menuId="groupMoreOptionsFeatures" icon={MoreHorizontal}>
  {#if checkGroupCapabilities(['core-groups-update'], $me, group).success}
    <PopupMenuButton
      title={t('common.actions.edit') + ' ' + 'group'}
      text={t('common.actions.edit')}
      icon={Pencil}
      action={() => {
        goto(`/groups/@${group.handle}/edit`);
      }}
    />
  {/if}
  {#if checkGroupCapabilities(['core-groups-addMember'], $me, group).success}
    <PopupMenuButton
      title="Add Members"
      text="Add Members"
      icon={UserPlus}
      action={() => {
        modalManager.show(AddMemberModal, { group });
      }}
    />
  {/if}
  <PopupMenuButton
    title="Leave group"
    text="Leave group"
    icon={LogOut}
    action={handleLeaveGroup}
  />
  <!--PopupMenuButton text="Report group" icon={Flag} action={() => {}} /-->
  {#if checkGroupCapabilities(['core-groups-delete'], $me, group).success}
    <PopupMenuButton
      title={t('common.actions.delete') + ' ' + 'group'}
      text={t('common.actions.delete')}
      icon={Trash}
      action={() => modalManager.show(DeleteGroupModal, { group , callback: () => {window.history.back()}})}
      danger={true}
    />
  {/if}
</PopupMenu>
