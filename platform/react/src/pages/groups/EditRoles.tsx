import { useParams } from 'react-router-dom';
import { useT, useSetPageHeader } from '../../index';
import { GroupForm } from '../../components';
import { useEditGroup } from '../../hooks';
import { Button, LoadingSpinner, Toast } from '@openpeepshq/react-ui';
import { routeHandleParam } from '../../lib/routeHandles';

export function EditGroupRoles() {
  const t = useT();
  const { handle: handleParam = '' } = useParams<{ handle: string }>();
  const {
    groupQuery,
    groupData,
    setGroupData,
    submitting,
    error,
    clearError,
    canEditCapabilities,
    submit,
  } = useEditGroup(routeHandleParam(handleParam), { section: 'roles' });

  useSetPageHeader(
    t('groups.edit.roles.title', {
      defaultValue: 'Roles & capabilities',
    }),
  );

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

  return (
    <div className="space-y-4 p-4 pb-12">
      <GroupForm
        groupData={groupData}
        isEdit
        sections={['roles']}
        onChange={setGroupData}
      />

      {error && (
        <Toast variant="error" onDismiss={clearError}>
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
