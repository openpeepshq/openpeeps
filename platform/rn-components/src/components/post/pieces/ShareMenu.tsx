import React, { type ReactNode } from 'react';
import { Share } from 'react-native';
import RNFS from 'react-native-fs';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PublicPost } from '@openpeepshq/common';
import { useShareMenu } from '@openpeepshq/react';
import {
  CalendarIcon,
  CopyIcon,
  Repeat2Icon,
  SendIcon,
  ShareIcon,
} from '../../icons/index';
import {
  PopupMenu,
  PopupMenuButton,
  PopupSeparator,
  PopupSection,
} from '../../ui';
import { MainStackParamList } from '../../navigation/types/index';
import { BASE_URL } from '../../../lib/constants';
import { useNewConversationStore } from '../../../stores/useNewConversationStore';

export interface ShareMenuProps {
  post: PublicPost;
  menuButton?: ReactNode;
}

export const ShareMenu = ({ post, menuButton }: ShareMenuProps) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const setDraftMessage = useNewConversationStore((s) => s.setContt);
  const postUrl = `${BASE_URL}/posts/${post.id}`;
  const { signedIn, isEvent, repost, eventIcsFile } = useShareMenu(
    post,
    postUrl
  );

  // No download folder on mobile: write the .ics to cache and hand it to the share sheet.
  const shareEventIcs = async () => {
    const file = eventIcsFile();
    if (!file) return;
    const path = `${RNFS.CachesDirectoryPath}/${file.filename}`;
    await RNFS.writeFile(path, file.content, 'utf8');
    await Share.share({ url: `file://${path}`, title: file.filename });
  };

  const copyLink = () => {
    Clipboard.setString(postUrl);
    Toast.show({
      type: 'success',
      text1: t('posts.copyPostLink.success'),
      text2: t('posts.copyPostLink.successMessage'),
    });
  };

  return (
    <PopupMenu
      menuButton={
        menuButton ?? <ShareIcon size={18} className="text-foreground" />
      }
      title={t('posts.shareMenu.title', { defaultValue: 'Share' })}
    >
      {signedIn ? (
        <>
          <PopupSection
            title={t('posts.shareMenu.shareOnCommunity', {
              defaultValue: 'Share on community',
            })}
          />
          <PopupMenuButton
            title={t('posts.shareMenu.repostToFeed', {
              defaultValue: 'Repost',
            })}
            text={t('posts.shareMenu.repostToFeed', {
              defaultValue: 'Repost',
            })}
            icon={Repeat2Icon as any}
            action={repost}
          />
          <PopupMenuButton
            title={t('posts.shareMenu.sendInMessage', {
              defaultValue: 'Send in message',
            })}
            text={t('posts.shareMenu.sendInMessage', {
              defaultValue: 'Send in message',
            })}
            icon={SendIcon as any}
            action={() => {
              setDraftMessage(postUrl);
              navigation.navigate('SelectPrivateMessageMembers');
            }}
          />
          <PopupSeparator />
          <PopupSection
            title={t('posts.shareMenu.otherOptions', {
              defaultValue: 'Other options',
            })}
          />
        </>
      ) : null}
      {isEvent ? (
        <PopupMenuButton
          title={t('posts.shareMenu.downloadCalendarIcsTitle', {
            defaultValue: 'Download calendar file',
          })}
          text={t('posts.shareMenu.downloadCalendarIcs', {
            defaultValue: 'Add to calendar (.ics)',
          })}
          icon={CalendarIcon as any}
          action={shareEventIcs}
        />
      ) : null}
      <PopupMenuButton
        title={t('posts.shareMenu.copyLink', { defaultValue: 'Copy link' })}
        text={t('posts.shareMenu.copyLink', { defaultValue: 'Copy link' })}
        icon={CopyIcon as any}
        action={copyLink}
      />
    </PopupMenu>
  );
};
