import { useMemo, useState } from 'react';
import { CopyPlus, Pencil, Trash } from 'lucide-react';
import type { Event, PublicPost } from '@openpeepshq/common/types';
import { checkPostCapabilities } from '@openpeepshq/common/lib';
import { PopupMenu, PopupMenuButton } from '@openpeepshq/react-ui';
import { useNavigate } from '../../../contexts/router';
import { useT } from '../../../i18n';
import { getNewPostStores } from '../../../stores';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useCapabilities } from '../../server-data';
import { DeletePostModal } from './modals/DeletePostModal';

export interface EventMenuProps {
  post: PublicPost;
  menuButton?: React.ReactNode;
}

export function EventMenu({ post, menuButton }: EventMenuProps) {
  const t = useT();
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const [showDelete, setShowDelete] = useState(false);

  const canDeletePost = useMemo(
    () =>
      checkPostCapabilities(authData, ['core-posts-delete'], post, capabilities)
        .success,
    [authData, post, capabilities],
  );

  if (me?.id !== post.profile.id) return null;

  const duplicate = () => {
    getNewPostStores().event = {
      type: 'event',
      visibility: post.visibility,
      data: { ...(post.data as Event) },
      audience: post.audience,
      groupId: post.groupId,
      mentions: post.mentions,
    };
    navigate('/events/new');
  };

  return (
    <>
      <PopupMenu
        menuButton={menuButton}
        title={t('events.menu.title', { defaultValue: 'Event options' })}
      >
        <PopupMenuButton
          title={t('common.actions.edit', { defaultValue: 'Edit' })}
          text={t('common.actions.edit', { defaultValue: 'Edit' })}
          icon={Pencil}
          action={`/events/${post.id}/edit`}
        />
        {canDeletePost ? (
          <PopupMenuButton
            title={t('common.actions.delete', { defaultValue: 'Delete' })}
            text={t('common.actions.delete', { defaultValue: 'Delete' })}
            icon={Trash}
            danger
            action={() => setShowDelete(true)}
          />
        ) : null}
        <PopupMenuButton
          title={t('common.actions.duplicate', { defaultValue: 'Duplicate' })}
          text={t('common.actions.duplicate', { defaultValue: 'Duplicate' })}
          icon={CopyPlus}
          action={duplicate}
        />
      </PopupMenu>

      <DeletePostModal
        post={post}
        open={showDelete}
        onClose={() => setShowDelete(false)}
        deleteCallback={() => window.history.back()}
      />
    </>
  );
}
