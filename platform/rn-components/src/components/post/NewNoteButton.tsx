import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  canCreatePost,
  type GroupWithMeta,
  type ProfileWithMeta,
  type VisibilityType,
} from '@openpeepshq/common';
import { useAuthData } from '@openpeepshq/react';
import { useSetPlusButtonActions } from '../layout';
import { useNewPostModal } from './post-form/NewPostModalContext';

export interface NewNoteButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
  /** When false, only registers the floating plus button (no inline feed button). */
  inline?: boolean;
}

/** Registers the RootLayout plus button for creating a note. */
export const NewNoteButton = ({
  visibility,
  currentProfile,
  group,
}: NewNoteButtonProps) => {
  const { t } = useTranslation();
  const authData = useAuthData();
  const { openNewPost } = useNewPostModal();

  const profile = currentProfile ?? authData.profile;
  const canPost =
    !!profile && canCreatePost(authData, 'note', visibility, group);

  const plusActions = useMemo(
    () =>
      canPost
        ? {
            title: t('posts.form.title'),
            action: () => openNewPost({ visibility, group }),
          }
        : undefined,
    [canPost, group, openNewPost, t, visibility]
  );

  useSetPlusButtonActions(plusActions);
  return null;
};
