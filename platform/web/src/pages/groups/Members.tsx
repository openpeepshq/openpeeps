import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { GroupHeader, GroupMembersList } from '@openpeeps/react/components';
import { routeHandleParam } from '../../lib/routeHandles';

export function GroupMembers() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();

  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const group = groupQuery.data;
  const membersQuery = openpeepsApi.useGroupMembers(group?.id ?? '');

  if (groupQuery.isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-2xl font-bold">
          {t('groups.notFound', { defaultValue: 'Group not found' })}
        </p>
      </div>
    );
  }

  return (
    <div>
      <GroupHeader group={group} />
      <h2 className="border-b p-4 text-lg font-semibold">
        {t('groups.members.title', { defaultValue: 'Members' })} (
        {membersQuery.data?.length ?? '…'})
      </h2>
      <GroupMembersList group={group} />
    </div>
  );
}
