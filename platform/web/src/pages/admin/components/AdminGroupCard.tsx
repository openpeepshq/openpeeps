import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash, Users } from 'lucide-react';
import { sortGroupMembers } from '@openpeeps/common/lib';
import type { GroupWithMeta } from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { Avatar, GroupCard } from '@openpeeps/react/components';
import { PopupMenu, PopupMenuButton } from '@openpeeps/react-ui';

export interface AdminGroupCardProps {
  group: GroupWithMeta;
  onDelete: (group: GroupWithMeta) => void;
}

export function AdminGroupCard({ group, onDelete }: AdminGroupCardProps) {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const membersQuery = openpeepsApi.useGroupMembers(group.id);

  const admins = useMemo(
    () =>
      sortGroupMembers(membersQuery.data ?? []).filter((m) =>
        m.roles?.includes('admin'),
      ),
    [membersQuery.data],
  );

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
      {admins.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-2 pt-0">
          {admins.map((admin) => (
            <Link
              key={admin.profile.id}
              to={`/@${admin.profile.handle}`}
              className="bg-surface-100 hover:bg-surface-200 flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-xs"
            >
              <Avatar profile={admin.profile} size={1.5} />
              <span>
                {admin.profile.displayName || `@${admin.profile.handle}`}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
