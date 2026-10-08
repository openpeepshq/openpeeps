import { useState } from 'react';
import { CopyPlus, Pencil, Trash } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { PopupMenu, PopupMenuButton } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { useEventMenu } from '../../../hooks/events/useEventMenu';
import { DeletePostModal } from './modals/DeletePostModal';

export interface EventMenuProps {
  post: PublicPost;
  occurrence?: string;
  menuButton?: React.ReactNode;
}

export function EventMenu({ post, occurrence, menuButton }: EventMenuProps) {
  const t = useT();
  const [showDelete, setShowDelete] = useState(false);
  const {
    isOwner,
    canDeletePost,
    thisOccurrence,
    duplicate,
    deleteThisOccurrence,
  } = useEventMenu(post, occurrence, () => window.history.back());

  if (!isOwner) return null;

  return (
    <>
      <PopupMenu
        menuButton={menuButton}
        title={t('events.menu.title', { defaultValue: 'Event options' })}
      >
        {thisOccurrence ? (
          <PopupMenuButton
            title={t('events.menu.editThis', {
              defaultValue: 'Edit this event',
            })}
            text={t('events.menu.editThis', {
              defaultValue: 'Edit this event',
            })}
            icon={Pencil}
            action={`/events/${post.id}/edit?occurrence=${encodeURIComponent(occurrence ?? '')}`}
          />
        ) : null}
        <PopupMenuButton
          title={
            thisOccurrence
              ? t('events.menu.editAll', { defaultValue: 'Edit all events' })
              : t('common.actions.edit', { defaultValue: 'Edit' })
          }
          text={
            thisOccurrence
              ? t('events.menu.editAll', { defaultValue: 'Edit all events' })
              : t('common.actions.edit', { defaultValue: 'Edit' })
          }
          icon={Pencil}
          action={`/events/${post.id}/edit`}
        />
        {canDeletePost && thisOccurrence ? (
          <PopupMenuButton
            title={t('events.menu.deleteThis', {
              defaultValue: 'Delete this event',
            })}
            text={t('events.menu.deleteThis', {
              defaultValue: 'Delete this event',
            })}
            icon={Trash}
            danger
            action={() => void deleteThisOccurrence()}
          />
        ) : null}
        {canDeletePost ? (
          <PopupMenuButton
            title={
              thisOccurrence
                ? t('events.menu.deleteAll', {
                    defaultValue: 'Delete all events',
                  })
                : t('common.actions.delete', { defaultValue: 'Delete' })
            }
            text={
              thisOccurrence
                ? t('events.menu.deleteAll', {
                    defaultValue: 'Delete all events',
                  })
                : t('common.actions.delete', { defaultValue: 'Delete' })
            }
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
