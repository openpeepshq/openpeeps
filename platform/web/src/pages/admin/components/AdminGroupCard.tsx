import { Link, useNavigate } from 'react-router-dom';
import { Trash, Users } from 'lucide-react';
import type {
  AdminGroup,
  GroupData,
  PublicProfile,
} from '@openpeepshq/common/types';
import { useT } from '@openpeepshq/react';
import { Avatar, GroupCard } from '@openpeepshq/react/components';
import { PopupMenu, PopupMenuButton } from '@openpeepshq/react-ui';

export interface AdminGroupCardProps {
  group: AdminGroup;
  onDelete: (group: AdminGroup) => void;
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : '—';

const groupVisibility = (
  capabilities: GroupData['capabilities'] | undefined,
) => {
  if (capabilities?.none?.add?.includes('core-groups-read')) return 'public';
  if (capabilities?.local?.add?.includes('core-groups-read')) return 'local';
  return 'private';
};

const postsVisibility = (
  capabilities: GroupData['capabilities'] | undefined,
) => {
  if (capabilities?.none?.add?.includes('core-posts-read')) return 'public';
  if (capabilities?.local?.add?.includes('core-posts-read')) return 'local';
  return 'private';
};

const whoCanJoin = (capabilities: GroupData['capabilities'] | undefined) =>
  capabilities?.local?.add?.includes('core-groups-join') ? 'open' : 'closed';

const whoCanPost = (capabilities: GroupData['capabilities'] | undefined) =>
  capabilities?.member?.add?.includes('core-posts-create-*')
    ? 'members'
    : 'admin';

export function AdminGroupCard({ group, onDelete }: AdminGroupCardProps) {
  const t = useT();
  const navigate = useNavigate();

  const visibility = groupVisibility(group.capabilities);
  const contentVisibility = postsVisibility(group.capabilities);
  const joinPolicy = whoCanJoin(group.capabilities);
  const postPolicy = whoCanPost(group.capabilities);

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between gap-2 p-2">
        <GroupCard group={group} showAction={false} />
        <PopupMenu placement="bottom-end" width="w-56">
          <PopupMenuButton
            icon={Users}
            title={t('groups.viewMembers', { defaultValue: 'View members' })}
            text={t('groups.viewMembers', { defaultValue: 'View members' })}
            action={() => navigate(`/admin/groups/@${group.handle}/members`)}
          />
          <PopupMenuButton
            icon={Trash}
            title={t('admin.groups.delete', { defaultValue: 'Delete group' })}
            text={t('common.actions.delete', { defaultValue: 'Delete' })}
            action={() => onDelete(group)}
            danger
          />
        </PopupMenu>
      </div>

      <div className="text-muted-foreground grid gap-1 px-3 pb-2 text-xs sm:grid-cols-2">
        <p>
          {t('admin.groups.created', { defaultValue: 'Created' })}:{' '}
          {formatDate(group.createdAt)}
        </p>
        <p>
          {t('admin.groups.lastPost', { defaultValue: 'Last post' })}:{' '}
          {formatDate(group.lastPostAt)}
        </p>
        <p>
          {t('admin.groups.members', { defaultValue: 'Members' })}:{' '}
          {group.membersCount}
        </p>
        <p>
          {t('admin.groups.posts', { defaultValue: 'Posts' })}:{' '}
          {group.postsCount}
        </p>
        <p className="sm:col-span-2">
          {t('admin.groups.settings', { defaultValue: 'Settings' })}:{' '}
          {t(`groups.visibility.${visibility}.title`, {
            defaultValue: visibility,
          })}
          {' · '}
          {t(`groups.postsVisibility.${contentVisibility}.title`, {
            defaultValue: contentVisibility,
          })}
          {' · '}
          {t(`groups.whoCanJoin.${joinPolicy}.title`, {
            defaultValue: joinPolicy,
          })}
          {' · '}
          {t(`groups.whoCanPost.${postPolicy}.title`, {
            defaultValue: postPolicy,
          })}
        </p>
      </div>

      {group.admins.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-2 pt-0">
          {group.admins.map((admin) => (
            <Link
              key={admin.id}
              to={`/@${admin.handle}`}
              className="bg-muted hover:bg-muted flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs"
            >
              <Avatar profile={admin as PublicProfile} size={1.5} />
              <span>{admin.displayName || `@${admin.handle}`}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
