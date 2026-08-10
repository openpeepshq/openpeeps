import { useMemo, useState } from 'react';
import type { GroupWithMeta, PublicProfile } from '@openpeepshq/common/types';
import { groupName } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { ProfileSelector } from '../profile';

export interface AddGroupMemberModalProps {
  group: GroupWithMeta;
  onClose: () => void;
}

export const AddGroupMemberModal = ({
  group,
  onClose,
}: AddGroupMemberModalProps) => {
  const t = useT();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const membersQuery = openpeepsApi.useGroupMembers(group.id);
  const addMember = openpeepsApi.addGroupMemberAction({ id: group.id });
  const [submitting, setSubmitting] = useState(false);

  const banlist = useMemo(() => {
    const members = (membersQuery.data ?? []).map((m) => m.profile);
    return me ? [...members, me] : members;
  }, [membersQuery.data, me]);

  const submit = async (profiles: PublicProfile[]) => {
    if (!profiles.length || submitting) return;
    setSubmitting(true);
    try {
      for (const profile of profiles) {
        await addMember(profile);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProfileSelector
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
      mode="multiple"
      selectedProfiles={[]}
      banlist={banlist}
      onConfirm={submit}
      title={t('groups.modals.addMembers.title', {
        defaultValue: 'Add members to {{groupName}}',
        groupName: groupName(group),
      })}
    />
  );
};
