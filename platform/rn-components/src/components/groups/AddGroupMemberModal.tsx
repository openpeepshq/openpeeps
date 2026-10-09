import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupWithMeta, PublicProfile } from '@openpeepshq/common/types';
import { groupName } from '@openpeepshq/common/lib';
import { useCurrentProfile, useOpenpeeps } from '@openpeepshq/react';
import { ProfileSelector } from '../profile/index';
import { useControlledSheet } from '../../hooks/use-controlled-sheet';

export interface AddGroupMemberModalProps {
  group: GroupWithMeta;
  onClose: () => void;
}

export const AddGroupMemberModal = ({
  group,
  onClose,
}: AddGroupMemberModalProps) => {
  const { t } = useTranslation();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const membersQuery = openpeepsApi.useGroupMembers(group.id);
  const addMember = openpeepsApi.addGroupMemberAction({ id: group.id });
  const ref = useControlledSheet(true);
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
      ref={ref}
      selectType="async"
      asynOnSelect={submit}
      profilesToExclude={banlist}
      onDismiss={() => {
        if (!submitting) onClose();
      }}
      title={t('groups.modals.addMembers.title', {
        groupName: groupName(group),
      })}
    />
  );
};
