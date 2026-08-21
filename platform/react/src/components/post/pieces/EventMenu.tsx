import { useMemo, useState } from 'react';
import { CopyPlus, Pencil, Trash } from 'lucide-react';
import type { Event, PublicPost } from '@openpeepshq/common/types';
import {
  checkPostCapabilities,
  upsertEventException,
} from '@openpeepshq/common/lib';
import { PopupMenu, PopupMenuButton } from '@openpeepshq/react-ui';
import { useNavigate } from '../../../contexts/router';
import { useT } from '../../../i18n';
import { getNewPostStores } from '../../../stores';
import { useAuthData, useCurrentProfile } from '../../layout/IdentityContext';
import { useCapabilities } from '../../server-data';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { DeletePostModal } from './modals/DeletePostModal';

export interface EventMenuProps {
  post: PublicPost;
  occurrence?: string;
  menuButton?: React.ReactNode;
}

export function EventMenu({ post, occurrence, menuButton }: EventMenuProps) {
  const t = useT();
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const { openpeepsApi } = useOpenpeeps();
  const [showDelete, setShowDelete] = useState(false);
  const updatePost = openpeepsApi.updatePostAction({ id: post.id });
  const event = post.data as Event;
  const recurring = !!event.recurrence;
  const thisOccurrence = recurring && !!occurrence;

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
    navigate({ type: 'events', view: 'new' });
  };

  const deleteThisOccurrence = async () => {
    if (!occurrence) return;
    await updatePost(
      upsertEventException(event, {
        recurrenceId: occurrence,
        cancelled: true,
      }),
    );
    window.history.back();
  };

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
            action={`/events/${post.id}/edit?occurrence=${encodeURIComponent(occurrence)}`}
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
