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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { ThemedText } from '../../ui/themed-text';
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="px-2">
        {menuButton ?? <ShareIcon size={18} className="text-foreground" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mt-1">
        <DropdownMenuLabel>{t('posts.shareMenu.title')}</DropdownMenuLabel>
        {signedIn ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground">
                {t('posts.shareMenu.shareOnCommunity')}
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="flex-row gap-x-2 items-center"
                onPress={() => void repost()}
              >
                <Repeat2Icon size={16} className="text-foreground" />
                <ThemedText>{t('posts.shareMenu.repostToFeed')}</ThemedText>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex-row gap-x-2 items-center"
                onPress={() => {
                  setDraftMessage(postUrl);
                  navigation.navigate('SelectPrivateMessageMembers');
                }}
              >
                <SendIcon size={16} className="text-foreground" />
                <ThemedText>{t('posts.shareMenu.sendInMessage')}</ThemedText>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground">
              {t('posts.shareMenu.otherOptions')}
            </DropdownMenuLabel>
          </>
        ) : null}
        <DropdownMenuGroup>
          {isEvent ? (
            <DropdownMenuItem
              className="flex-row gap-x-2 items-center"
              onPress={() => void shareEventIcs()}
            >
              <CalendarIcon size={16} className="text-foreground" />
              <ThemedText>
                {t('posts.shareMenu.downloadCalendarIcs')}
              </ThemedText>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="flex-row gap-x-2 items-center"
            onPress={copyLink}
          >
            <CopyIcon size={16} className="text-foreground" />
            <ThemedText>{t('posts.shareMenu.copyLink')}</ThemedText>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
