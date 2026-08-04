import { useMemo, useState } from 'react';
import {
  MessageSquareText,
  MoreHorizontal,
  UserCog,
  UserMinus,
} from 'lucide-react';
import type { GroupMember, GroupWithMeta } from '@openpeepshq/common/types';
import {
  canChangeMemberRole,
  canRemoveMember,
  sortGroupMembers,
  truncateText,
} from '@openpeepshq/common/lib';
import {
  PopupMenu,
  PopupMenuButton,
} from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { AccessDeniedLoader } from '../layout/AccessDeniedLoader';
import { useCurrentProfile } from '../layout/IdentityContext';
import { Avatar } from '../profile';
import { useCreateNewConversation } from '../conversations/CreateNewConversationContext';
import { ChangeGroupRolesModal } from './ChangeGroupRolesModal';
import { ConfirmMemberRemovalModal } from './ConfirmMemberRemovalModal';

export interface GroupMembersListProps {
  group: GroupWithMeta;
}

type ActiveModal =
  | { type: 'roles'; member: GroupMember }
  | { type: 'remove'; member: GroupMember }
  | null;

export function GroupMembersList({ group }: GroupMembersListProps) {
  const t = useT();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const { openCreateConversation } = useCreateNewConversation();
  const membersQuery = openpeepsApi.useGroupMembers(group.id);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const members = useMemo(
    () => sortGroupMembers(membersQuery.data ?? []),
    [membersQuery.data],
  );

  return (
    <AccessDeniedLoader queries={[membersQuery]}>
      <div className="flex flex-col">
        {members.map((member) => (
          <div
            key={member.profile.id}
            className="flex items-center justify-between gap-3 border-b p-4"
          >
            <a
              href={`/@${member.profile.handle}`}
              className="hover:bg-muted flex min-w-0 flex-1 items-center gap-3 rounded-md"
            >
              <Avatar profile={member.profile} size={3} />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold">
                  {member.profile.displayName ||
                    `@${member.profile.handle}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  @{member.profile.handle}
                </span>
                {member.roles?.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {member.roles.map((role) => (
                      <span
                        key={role}
                        className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs uppercase"
                      >
                        {t(`groups.roles.${role}`, { defaultValue: role })}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </a>

            {me?.id !== member.profile.id ? (
              <PopupMenu icon={MoreHorizontal} compact>
                <PopupMenuButton
                  icon={MessageSquareText}
                  title={`Message @${member.profile.handle}`}
                  text={t('conversations.newMessage', {
                    defaultValue: `Message @${truncateText(member.profile.handle, 10)}`,
                    handle: truncateText(member.profile.handle, 10),
                  })}
                  action={() =>
                    openCreateConversation({
                      profiles: [member.profile],
                      skipProfileSelection: true,
                    })
                  }
                />
                {me && canChangeMemberRole(me, group) ? (
                  <PopupMenuButton
                    icon={UserCog}
                    title={t('groups.changeRoles.title', {
                      defaultValue: 'Change roles',
                    })}
                    text={t('groups.changeRoles.title', {
                      defaultValue: 'Change roles',
                    })}
                    action={() =>
                      setActiveModal({ type: 'roles', member })
                    }
                  />
                ) : null}
                {me && canRemoveMember(me, group) ? (
                  <PopupMenuButton
                    icon={UserMinus}
                    title={t('groups.actions.removeFromGroup', {
                      defaultValue: 'Remove from group',
                    })}
                    text={t('groups.actions.removeFromGroup', {
                      defaultValue: 'Remove from group',
                    })}
                    action={() =>
                      setActiveModal({ type: 'remove', member })
                    }
                    danger
                  />
                ) : null}
              </PopupMenu>
            ) : null}
          </div>
        ))}
      </div>

      {activeModal?.type === 'roles' ? (
        <ChangeGroupRolesModal
          group={group}
          member={activeModal.member}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
      {activeModal?.type === 'remove' ? (
        <ConfirmMemberRemovalModal
          group={group}
          profile={activeModal.member.profile}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </AccessDeniedLoader>
  );
}
