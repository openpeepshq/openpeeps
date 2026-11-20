import React, { type ReactNode } from 'react';
import { Share } from 'react-native';
import RNFS from 'react-native-fs';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PublicPost } from '@openpeepshq/common';
import { isPubliclyShareable } from '@openpeepshq/common/lib';
import { postPublicPath, useShareMenu } from '@openpeepshq/react';
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
  const postUrl = `${BASE_URL}${postPublicPath(post)}`;
  const { signedIn, isEvent, repost, eventIcsFile } = useShareMenu(
    post,
    postUrl
  );
  // Repost/DM are valid for any post the viewer can see; handing the link to
  // the outside world only makes sense for publicly readable posts.
  const externallyShareable = isPubliclyShareable(post);
  // A signed-out viewer of a non-public, non-event post would get an empty
  // menu — hide the whole affordance instead (review round 5, S1).
  const menuAvailable = isEvent || externallyShareable || signedIn;

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
      text1: t('posts.shareMenu.linkCopied', { defaultValue: 'Link copied' }),
    });
  };

  const systemShare = async () => {
    try {
      // Android drops `url` from the payload (react-native >=0.85 builds the
      // sheet from title+message only), so ship the link as the message.
      await Share.share({
        url: postUrl,
        message: postUrl,
        title: t('posts.shareMenu.title', { defaultValue: 'Share' }),
      });
    } catch {
      // User dismissed the sheet; nothing to do.
    }
  };

  if (!menuAvailable) return null;

  return (
    <>
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
          </>
        ) : null}
        {signedIn && (isEvent || externallyShareable) ? (
          <>
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
        {externallyShareable ? (
          <>
            <PopupMenuButton
              title={t('posts.shareMenu.systemShare', {
                defaultValue: 'Share via…',
              })}
              text={t('posts.shareMenu.systemShare', {
                defaultValue: 'Share via…',
              })}
              icon={ShareIcon as any}
              action={() => void systemShare()}
            />
            <PopupMenuButton
              title={t('posts.shareMenu.copyLink', {
                defaultValue: 'Copy link',
              })}
              text={t('posts.shareMenu.copyLink', {
                defaultValue: 'Copy link',
              })}
              icon={CopyIcon as any}
              action={copyLink}
            />
          </>
        ) : null}
      </PopupMenu>
    </>
  );
};
