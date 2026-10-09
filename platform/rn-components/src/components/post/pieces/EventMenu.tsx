import React, { useRef, type ReactNode } from 'react';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { PublicPost } from '@openpeepshq/common';
import { useEventMenu, useOpenpeeps } from '@openpeepshq/react';
import {
  CopyPlusIcon,
  MoreVerticalIcon,
  PencilLineIcon,
  Trash2Icon,
} from '../../icons/index';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { ThemedText } from '../../ui/themed-text';
import { MainStackParamList } from '../../navigation/types/index';
import { bottomSheetPresent } from '../../../lib/bottom-sheet-ref';
import { DeleteEventModal } from './modals/DeleteEventModal';

export interface EventMenuProps {
  post: PublicPost;
  occurrence?: string;
  menuButton?: ReactNode;
}

export const EventMenu = ({ post, occurrence, menuButton }: EventMenuProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const deleteEventRef = useRef<BottomSheetModal>(null);
  const deletePost = openpeepsApi.deletePostAction({ id: post.id });
  const {
    isOwner,
    canDeletePost,
    thisOccurrence,
    duplicate,
    deleteThisOccurrence,
  } = useEventMenu(post, occurrence, () => navigation.goBack());

  if (!isOwner) return null;

  const handleDelete = async () => {
    const res = await deletePost();
    Toast.show({
      type: res ? 'success' : 'error',
      text1: res ? t('posts.delete.success') : t('posts.delete.error'),
    });
    if (res) navigation.goBack();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="px-2">
          {menuButton ?? <MoreVerticalIcon className="text-foreground" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mt-1">
          <DropdownMenuGroup>
            {thisOccurrence ? (
              <DropdownMenuItem
                className="flex-row gap-x-2 items-center"
                onPress={() =>
                  navigation.navigate('EditEvent', { id: post.id, occurrence })
                }
              >
                <PencilLineIcon className="text-foreground" size={18} />
                <ThemedText>{t('events.menu.editThis')}</ThemedText>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className="flex-row gap-x-2 items-center"
              onPress={() => navigation.navigate('EditEvent', { id: post.id })}
            >
              <PencilLineIcon className="text-foreground" size={18} />
              <ThemedText>
                {thisOccurrence
                  ? t('events.menu.editAll')
                  : t('common.actions.edit')}
              </ThemedText>
            </DropdownMenuItem>
            {canDeletePost && thisOccurrence ? (
              <DropdownMenuItem
                className="flex-row gap-x-2 items-center"
                onPress={() => void deleteThisOccurrence()}
              >
                <Trash2Icon className="text-destructive" size={18} />
                <ThemedText className="text-destructive">
                  {t('events.menu.deleteThis')}
                </ThemedText>
              </DropdownMenuItem>
            ) : null}
            {canDeletePost ? (
              <DropdownMenuItem
                className="flex-row gap-x-2 items-center"
                onPress={() => bottomSheetPresent(deleteEventRef)}
              >
                <Trash2Icon className="text-destructive" size={18} />
                <ThemedText className="text-destructive">
                  {thisOccurrence
                    ? t('events.menu.deleteAll')
                    : t('common.actions.delete')}
                </ThemedText>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className="flex-row gap-x-2 items-center"
              onPress={duplicate}
            >
              <CopyPlusIcon className="text-foreground" size={18} />
              <ThemedText>{t('common.actions.duplicate')}</ThemedText>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteEventModal ref={deleteEventRef} onDelete={handleDelete} />
    </>
  );
};
