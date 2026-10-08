import { useT, useSetPageHeader } from '../../index';
import { GroupForm, ProfilesInput, useCurrentProfile } from '../../components';
import { useNewGroup } from '../../hooks';
import { Button, Label, Toast } from '@openpeepshq/react-ui';

export function NewGroup() {
  const t = useT();
  const me = useCurrentProfile();
  const {
    groupData,
    setGroupData,
    members,
    setMembers,
    submitting,
    error,
    clearError,
    fieldErrors,
    submit,
  } = useNewGroup();

  useSetPageHeader(
    t('groups.new.title', { defaultValue: 'Create group' }),
    undefined,
    'groups-create-page-title',
  );

  return (
    <div className="space-y-4 p-4 pb-12">
      <GroupForm
        groupData={groupData}
        fieldErrors={fieldErrors}
        onChange={setGroupData}
      />

      <div className="space-y-2 px-1">
        <Label htmlFor="group-members">
          {t('groups.form.members', { defaultValue: 'Members' })}
        </Label>
        <ProfilesInput
          value={members}
          onChange={setMembers}
          banlist={me ? [me] : []}
          placeholder={t('groups.form.membersPlaceholder', {
            defaultValue: 'Add members to this group',
          })}
        />
      </div>

      {error && (
        <Toast
          variant="error"
          testId="groups-duplicate-handle-error"
          onDismiss={clearError}
        >
          {error}
        </Toast>
      )}

      <Button
        title="Create group"
        variant="default"
        action={submit}
        disabled={submitting}
        data-testid="groups-create-submit"
      >
        {submitting
          ? t('common.submitting', { defaultValue: 'Creating…' })
          : t('common.submit', { defaultValue: 'Create group' })}
      </Button>
    </div>
  );
}
