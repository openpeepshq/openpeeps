<script lang="ts">
  import { ProfileCard } from '$lib/components/core/profile';
  import type {
    GroupMember,
    GroupWithMeta,
    PublicProfile,
  } from '@openpeeps/common/types';
  import { groupMembersStore } from '$lib/api';
  import {
    Badges,
    PopupMenuButton,
    PopupMenu,
    getModalManager,
  } from '@openpeeps/ui';
  import {
    canChangeMemberRole,
    canRemoveMember,
    sortGroupMembers,
    truncateText,
  } from '@openpeeps/common/lib';
  import ConfirmMemberRemovalModal from './pieces/modals/ConfirmMemberRemovalModal.svelte';
  import { CreateNewConversation } from '../conversations';
  import { MessageSquareText, UserCog, UserMinus } from 'lucide-svelte';
  import ChangeGroupRolesModal from './pieces/modals/ChangeGroupRolesModal.svelte';
  import { i18nContext } from '$lib/components/i18n';
  import { AccessDeniedLoader } from '$lib/components/layout';
  import { getCurrentProfile } from '$lib/auth';

  const me = getCurrentProfile();

  interface Props {
    group: GroupWithMeta;
  }

  let { group }: Props = $props();

  const modalManager = getModalManager();
  const membersQuery = groupMembersStore(group.id);
  const { t } = i18nContext();
  const triggerRemoveMember = (profile: PublicProfile) =>
    modalManager.show(ConfirmMemberRemovalModal, {
      group: group,
      profile: profile,
    });

  const triggerChangeRole = (member: GroupMember) =>
    modalManager.show(ChangeGroupRolesModal, {
      group: group,
      member: member,
    });

  let members = $derived(sortGroupMembers($membersQuery.data || []));
</script>

<AccessDeniedLoader queries={[$membersQuery]}>
  {#each members || [] as member (member.profile.id)}
    <ProfileCard profile={member.profile}>
      {#snippet badges()}
        <Badges
          data={member.roles?.map((r) => ({
            status: t(`groups.roles.${r}`),
            variant: 'variant-soft-primary',
          })) || []}
        />
      {/snippet}
      {#snippet action()}
        <PopupMenu>
          {#if me?.id !== member.profile.id}
            <PopupMenuButton
              icon={MessageSquareText}
              title={`Message @${member.profile.handle}`}
              action={() =>
                modalManager.show(CreateNewConversation, {
                  profiles: [member.profile],
                })}
              text={`Message @${truncateText(member.profile.handle, 10)}`}
            />
            {#if canChangeMemberRole(me, group)}
              <PopupMenuButton
                icon={UserCog}
                title={t('groups.changeRoles.title')}
                action={() => triggerChangeRole(member)}
                text={t('groups.changeRoles.title')}
              />
            {/if}
            {#if canRemoveMember(me, group)}
              <PopupMenuButton
                icon={UserMinus}
                title="Remove from group"
                danger={true}
                action={() => triggerRemoveMember(member.profile)}
                text="Remove from group"
              />
            {/if}
          {/if}
        </PopupMenu>
      {/snippet}
    </ProfileCard>
  {/each}
</AccessDeniedLoader>
