import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GroupData } from '@openpeepshq/common/types';
import { checkGroupCapabilities } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import {
  GroupForm,
  useAuthData,
  type GroupRolesMode,
} from '../../components';
import { Button, LoadingSpinner, Toast } from '@openpeepshq/react-ui';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import { routeHandleParam } from '../../lib/routeHandles';

export function EditGroupRoles() {
  const t = useT();
  const navigate = useNavigate();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const handle = routeHandleParam(handleParam);
  const { openpeepsApi } = useOpenpeeps();
  const authData = useAuthData();
  const groupQuery = openpeepsApi.useGroupByHandle(handle);
  const updateGroup = openpeepsApi.updateGroupAction();

  useSetPageHeader(
    t('groups.edit.roles.title', {
      defaultValue: 'Roles & capabilities',
    }),
  );

  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [rolesMode, setRolesMode] = useState<GroupRolesMode>('simple');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canEditCapabilities = checkGroupCapabilities(
    authData,
    ['core-groups-updateCapabilities'],
    groupQuery.data,
  ).success;

  if (!canEditCapabilities) {
    return (
      <div className="p-8 text-center text-sm">
        {t('groups.edit.rolesForbidden', {
          defaultValue:
            'You do not have permission to edit roles and capabilities.',
        })}
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
      setError(apiErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <GroupForm
        groupData={groupData}
        isEdit
        sections={['roles']}
        rolesMode={rolesMode}
        onRolesModeChange={setRolesMode}
        showRolesModeToggle
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
