import { useState } from 'react';
import { LinkIcon, MailIcon, PlusIcon } from 'lucide-react';
import { useT } from '../../../index';
import { PopupMenu, PopupMenuButton } from '@openpeepshq/react-ui';
import { InviteWithEmailModal } from './InviteWithEmailModal';
import { InviteWithLinkModal } from './InviteWithLinkModal';

type ActiveModal = 'link' | 'email' | null;

export function AdminInviteActions() {
  const t = useT();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const newInviteLabel = t('admin.invites.newInvite', {
    defaultValue: 'New Invite',
  });

  return (
    <>
      <span data-testid="admin-new-invite-button">
        <PopupMenu
          placement="bottom-end"
          variant="default"
          className="px-3 py-1.5"
          title={newInviteLabel}
          menuButton={<PlusIcon size={16} />}
          text={newInviteLabel}
        >
          <PopupMenuButton
            icon={LinkIcon}
            title={t('admin.invites.inviteWithLinkTitle', {
              defaultValue: 'Invite with link',
            })}
            text={t('admin.invites.inviteWithLinkTitle', {
              defaultValue: 'Invite with link',
            })}
            action={() => setActiveModal('link')}
          />
          <PopupMenuButton
            icon={MailIcon}
            title={t('admin.members.inviteWithEmailTitle', {
              defaultValue: 'Invite by email',
            })}
            text={t('admin.members.inviteWithEmailTitle', {
              defaultValue: 'Invite by email',
            })}
            action={() => setActiveModal('email')}
          />
        </PopupMenu>
      </span>

      {activeModal === 'link' ? (
        <InviteWithLinkModal onClose={() => setActiveModal(null)} />
      ) : null}
      {activeModal === 'email' ? (
        <InviteWithEmailModal onClose={() => setActiveModal(null)} />
      ) : null}
    </>
  );
}
