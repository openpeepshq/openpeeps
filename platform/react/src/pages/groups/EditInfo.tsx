import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GroupData } from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import { GroupForm } from '../../components';
import { Button, LoadingSpinner, Toast } from '@openpeepshq/react-ui';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import {
  groupFormFieldErrors,
  hasGroupFormFieldErrors,
  type GroupFormFieldErrors,
} from '../../lib/groupFormErrors';
import { routeHandleParam } from '../../lib/routeHandles';

export function EditGroupInfo() {
  const t = useT();
  const navigate = useNavigate();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const updateGroup = openpeepsApi.updateGroupAction();

  useSetPageHeader(
    t('groups.edit.info.title', { defaultValue: 'Group information' }),
  );

  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<GroupFormFieldErrors>({});

  useEffect(() => {
    if (groupQuery.data) {
      const {
        handle,
        avatar,
        header,
        displayName,
        description,
        rules,
        capabilities,
      } = groupQuery.data;
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
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
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
    const nextFieldErrors = groupFormFieldErrors(groupData, t, {
      skipHandle: true,
    });
    if (hasGroupFormFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const updated = (await updateGroup(
        { ...groupQuery.data!, ...groupData },
        { id: groupQuery.data!.id },
      )) as { handle: string };
      navigate(`/groups/@${updated.handle}`);
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <GroupForm
        groupData={groupData}
        fieldErrors={fieldErrors}
        isEdit
        sections={['info']}
        onChange={setGroupData}
      />

      {error && (
        <Toast variant="error" onDismiss={() => setError(null)}>
          {error}
        </Toast>
      )}

      <Button
        title="Save"
        variant="default"
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
