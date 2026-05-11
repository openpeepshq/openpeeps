import { useParams } from 'react-router-dom';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { GroupHeader, PostMarkdown } from '@openpeeps/react/components';

export function GroupInfo() {
  const t = useT();
  const { handle = '' } = useParams<{ handle: string }>();
  const { openpeepsApi } = useOpenpeeps();

  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const group = groupQuery.data;

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
      <div className="space-y-2 p-4">
        <section className="border-b py-2">
          <h3 className="text-lg font-semibold">Description</h3>
          <PostMarkdown source={group.description || 'No description yet'} />
        </section>
        <section className="space-y-2 border-b py-2">
          <h3 className="text-lg font-semibold">Details</h3>
          {group.capabilities?.none?.add?.includes('core-groups-read') ? (
            <>
              <h4 className="font-semibold">Public</h4>
              <p>
                Anyone on this community can see posts in the group. Group
                members can add comments and create posts
              </p>
            </>
          ) : (
            <>
              <h4 className="font-semibold">Private</h4>
              <p>
                Only group members can see posts in the group. Group members
                can add comments and create posts
              </p>
            </>
          )}
          <h4 className="font-semibold">Created</h4>
          <p>{new Date(group.createdAt).toLocaleDateString()}</p>
        </section>
        <section className="border-b py-2">
          <h3 className="text-lg font-semibold">Rules</h3>
          <PostMarkdown source={group.rules || 'No rules yet'} />
        </section>
      </div>
    </div>
  );
}
