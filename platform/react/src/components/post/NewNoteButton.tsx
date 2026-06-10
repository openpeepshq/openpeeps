import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import {
  canCreatePost,
  type GroupWithMeta,
  type ProfileWithMeta,
  type VisibilityType,
} from '@openpeeps/common';
import { Button } from '@openpeeps/react-ui';
import { useT } from '../../i18n';
import { useSetPlusButtonActions } from '../../stores';
import { useAuthData } from '../layout/IdentityContext';
import { useNewPostModal } from './post-form/NewPostModalContext';

export interface NewNoteButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
  /** When false, only registers the floating plus button (no inline feed button). */
  inline?: boolean;
}

/** Registers the layout plus button for creating a note (no UI). */
export function useNewNotePlusButton({
  visibility,
  currentProfile,
  group,
}: Omit<NewNoteButtonProps, 'inline'>) {
  const t = useT();
  const authData = useAuthData();
  const { openNewPost } = useNewPostModal();

  const profile = currentProfile ?? authData.profile;
  const canPost =
    !!profile && canCreatePost(authData, 'note', visibility, group);

  const plusActions = useMemo(
    () =>
      canPost
        ? {
            title: t('posts.form.title', { defaultValue: 'New post' }),
            icon: Plus,
            action: () => openNewPost({ visibility, group }),
          }
        : undefined,
    [canPost, t, openNewPost, visibility, group],
  );

  useSetPlusButtonActions(plusActions);

  return { canPost, openNewPost: () => openNewPost({ visibility, group }) };
}

export function NewNoteButton({
  visibility,
  currentProfile,
  group,
  inline = false,
}: NewNoteButtonProps) {
  const t = useT();
  const { canPost, openNewPost } = useNewNotePlusButton({
    visibility,
    currentProfile,
    group,
  });

  if (!canPost || !inline) {
    return null;
  }

  return (
    <div className="mb-4">
      <Button
        title={t('posts.form.title', { defaultValue: 'New post' })}
        variant="variant-filled-primary"
        action={openNewPost}
        data-testid="posts-new-post-button"
      >
        <Plus className="mr-1 size-4" />
        {t('posts.form.newNote', { defaultValue: 'New post' })}
      </Button>
    </div>
  );
}
