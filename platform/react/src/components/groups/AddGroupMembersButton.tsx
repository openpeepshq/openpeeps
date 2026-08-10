import { useState } from 'react';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { checkGroupCapabilities } from '@openpeepshq/common/lib';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useAuthData } from '../layout/IdentityContext';
import { AddGroupMemberModal } from './AddGroupMemberModal';

export interface AddGroupMembersButtonProps {
  group: GroupWithMeta;
}

export const AddGroupMembersButton = ({ group }: AddGroupMembersButtonProps) => {
  const t = useT();
  const authData = useAuthData();
  const [open, setOpen] = useState(false);

  const canAddMembers = checkGroupCapabilities(
    authData,
    ['core-groups-addMember'],
    group,
  ).success;

  if (!canAddMembers) {
    return null;
  }

  return (
    <>
      <Button
        title={t('groups.actions.addMembers', { defaultValue: 'Add Members' })}
        variant="variant-ringed-primary"
        action={() => setOpen(true)}
        data-testid="groups-add-members-button"
      >
        {t('groups.actions.addMembers', { defaultValue: 'Add Members' })}
      </Button>
      {open ? (
        <AddGroupMemberModal group={group} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
};
