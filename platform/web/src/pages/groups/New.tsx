import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupData, PublicProfile } from '@openpeeps/common/types';
import { groupCapabilityTemplates } from '@openpeeps/common/lib';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import {
  GroupForm,
  ProfileSelector,
  useCurrentProfile,
  useServerInfo,
} from '@openpeeps/react/components';
import { Button, Label, Toast } from '@openpeeps/react-ui';

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

  const submit = async () => {
    setError(null);
    let data = groupData;
    if (data.handle.length === 0) {
      if (!data.displayName) {
        setError(
          t('handle.validation.error', {
            defaultValue: 'A handle or display name is required',
          }),
        );
        return;
      }
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
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 pb-12">
      <GroupForm groupData={groupData} onChange={setGroupData} />

      <div className="space-y-2 px-1">
        <Label htmlFor="group-members">
          {t('groups.form.members', { defaultValue: 'Members' })}
        </Label>
        <ProfileSelector
          selectedProfiles={members}
          onChange={setMembers}
          profilesToExclude={me ? [me] : []}
          placeholder={t('groups.form.membersPlaceholder', {
            defaultValue: 'Add members to this group',
          })}
          containerClassName="px-0"
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
        variant="variant-filled-primary"
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
