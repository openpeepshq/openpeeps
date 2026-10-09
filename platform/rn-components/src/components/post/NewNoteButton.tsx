import React from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  canCreatePost,
  type GroupWithMeta,
  type ProfileWithMeta,
  type VisibilityType,
} from '@openpeepshq/common';
import { useAuthData } from '@openpeepshq/react';
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('posts.form.title')}
      onPress={() => openNewPost({ visibility, group })}
      className="absolute bottom-10 right-6 z-20 size-16 items-center justify-center rounded-full bg-foreground"
    >
      <PencilLineIcon size={24} className="text-background" />
    </Pressable>
  );
};
