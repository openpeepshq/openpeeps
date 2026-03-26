<script lang="ts">
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { DeleteGroupModal, GroupCard } from '.';
  import { getModalManager, PopupMenu, PopupMenuButton } from '@openpeeps/ui';
  import { i18nContext } from '$lib/components/i18n';
  import { Trash, Users } from 'lucide-svelte';
  import { groupMembersStore } from '$lib/api';
  import { sortGroupMembers } from '@openpeeps/common';
  import ProfileBadge from '../profile/ProfileBadge.svelte';
  import { goto } from '$app/navigation';
  const { t } = i18nContext();
  const modalManager = getModalManager();

  interface Props {
    group: GroupWithMeta;
    deleteCallback?: () => void;
  }

  let { group, deleteCallback }: Props = $props();

  const membersQuery = groupMembersStore(group.id);

  let admins = $derived(
    sortGroupMembers($membersQuery.data || []).filter((m) =>
      m.roles?.includes('admin'),
    ),
  );
</script>

<div class="">
  <GroupCard {group}>
    {#snippet action()}
      <PopupMenu>
        <PopupMenuButton
          title={t('groups.viewMembers')}
          text={t('groups.viewMembers')}
          icon={Users}
          action={() =>
            goto(`/admin/groups/@${group.handle}/members`)
          }
        />
        <PopupMenuButton
          title={t('common.actions.delete') + ' ' + 'group'}
          text={t('common.actions.delete')}
          icon={Trash}
          action={() =>
            modalManager.show(DeleteGroupModal, {
              group,
              callback: deleteCallback,
            })}
        />
      </PopupMenu>
    {/snippet}
  </GroupCard>
  <div class="p-2">
    {#each admins || [] as admin (admin.profile.id)}
      <a href="/@{admin.profile.handle}" target="_blank" class="mr-2">
        <ProfileBadge profile={admin.profile} />
      </a>
    {/each}
  </div>
</div>
