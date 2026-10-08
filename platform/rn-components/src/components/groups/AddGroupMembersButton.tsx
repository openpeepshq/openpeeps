import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { checkGroupCapabilities } from '@openpeepshq/common/lib';
import { useAuthData } from '@openpeepshq/react';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';
import { AddGroupMemberModal } from './AddGroupMemberModal';

export interface AddGroupMembersButtonProps {
  group: GroupWithMeta;
}

export const AddGroupMembersButton = ({
  group,
}: AddGroupMembersButtonProps) => {
  const { t } = useTranslation();
  const authData = useAuthData();
  const [open, setOpen] = useState(false);

  const canAddMembers = checkGroupCapabilities(
    authData,
    ['core-groups-addMember'],
    group
  ).success;

  if (!canAddMembers) return null;

  return (
    <>
      <Button variant="outline" onPress={() => setOpen(true)}>
        <ThemedText>{t('groups.actions.addMembers')}</ThemedText>
      </Button>
      {open ? (
        <AddGroupMemberModal group={group} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
};
