import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  canCreatePost,
  type GroupWithMeta,
  type ProfileWithMeta,
  type VisibilityType,
} from '@openpeepshq/common';
import { useAuthData } from '@openpeepshq/react';
import { PlusFab } from '../custom/common/plus-fab';
import { PencilLineIcon } from '../icons/index';
import { useNewPostModal } from './post-form/NewPostModalContext';

export interface NewNoteButtonProps {
  visibility: VisibilityType;
  currentProfile?: ProfileWithMeta;
  group?: GroupWithMeta;
}

/** Floating action button — the native stand-in for the web layout plus button. */
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

  if (!canPost) return null;

  return (
    <PlusFab
      accessibilityLabel={t('posts.form.title')}
      onPress={() => openNewPost({ visibility, group })}
    >
      <PencilLineIcon size={24} className="text-background" />
    </PlusFab>
  );
};
