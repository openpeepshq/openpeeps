import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GroupData } from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { GroupForm } from '@openpeeps/react/components';
import { Button } from '@openpeeps/react-ui';

export function EditGroup() {
  const t = useT();
  const navigate = useNavigate();
  const { handle = '' } = useParams<{ handle: string }>();
  const { openpeepsApi } = useOpenpeeps();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const updateGroup = openpeepsApi.updateGroupAction();

  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupQuery.data) {
      const { handle, avatar, header, displayName, description, rules, capabilities } =
        groupQuery.data;
      setGroupData({
        handle,
        avatar,
        header,
        displayName,
        description,
        rules,
        capabilities,
      });
    }
  }, [groupQuery.data]);

  if (groupQuery.isLoading || !groupData) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {t('common.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }
  if (!groupQuery.data) {
    return (
      <div className="p-8 text-center text-2xl">
        {t('groups.notFound', { defaultValue: 'Group not found' })}
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const updated = (await updateGroup(
        { ...groupQuery.data!, ...groupData },
        { id: groupQuery.data!.id },
      )) as { handle: string };
      navigate(`/groups/@${updated.handle}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <h1 className="text-2xl font-semibold">
        {t('groups.edit.title', { defaultValue: 'Edit group' })}
      </h1>

      <GroupForm groupData={groupData} onChange={setGroupData} isEdit />

      {error && (
        <p className="border-error/40 text-error rounded-md border p-2 text-sm">
          {error}
        </p>
      )}

      <Button
        title="Save"
        variant="variant-filled-primary"
        action={submit}
        disabled={submitting}
      >
        {submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('common.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
