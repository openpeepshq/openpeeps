import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupData, PublicProfile } from '@openpeepshq/common/types';
import { groupCapabilityTemplates } from '@openpeepshq/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import {
  GroupForm,
  ProfilesInput,
  useCurrentProfile,
  useServerInfo,
} from '../../components';
import { Button, Label, Toast } from '@openpeepshq/react-ui';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import {
  duplicateHandleMessage,
  groupFormFieldErrors,
  hasGroupFormFieldErrors,
  isDuplicateHandleError,
  type GroupFormFieldErrors,
} from '../../lib/groupFormErrors';

export function NewGroup() {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const createGroup = openpeepsApi.createGroupAction();
  const { publicContent } = useServerInfo();
  const me = useCurrentProfile();
  const [members, setMembers] = useState<PublicProfile[]>([]);

  useSetPageHeader(
    t('groups.new.title', { defaultValue: 'Create group' }),
    undefined,
    'groups-create-page-title',
  );

  const [groupData, setGroupData] = useState<GroupData>(() => ({
    displayName: '',
    handle: '',
    description: '',
    rules: '',
    capabilities: publicContent
      ? groupCapabilityTemplates.defaultGroup.capabilities
      : groupCapabilityTemplates.defaultGroupClosedCommunity.capabilities,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<GroupFormFieldErrors>({});

  const submit = async () => {
    setError(null);
    const nextFieldErrors = groupFormFieldErrors(groupData, t);
    if (hasGroupFormFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});
    let data = groupData;
    if (data.handle.length === 0) {
      data = {
        ...data,
        handle: data
          .displayName!.toLowerCase()
          .replaceAll(' ', '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .trim()
          .slice(0, 16),
      };
    }
    setSubmitting(true);
    try {
      const group = (await createGroup({
        ...data,
        members,
      })) as { handle: string };
      navigate(`/groups/@${group.handle}`);
    } catch (err) {
      if (isDuplicateHandleError(err)) {
        const msg = duplicateHandleMessage(t);
        setFieldErrors({ handle: msg });
        setError(msg);
        return;
      }
      setError(
        apiErrorMessage(
          err,
          t,
          t('groups.create.error', { defaultValue: 'Failed to create group' }),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          onDismiss={() => setError(null)}
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
