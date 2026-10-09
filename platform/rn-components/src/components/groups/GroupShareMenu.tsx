import React from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { LinkIcon, PencilIcon, SendIcon, ShareIcon } from '../icons/index';
import { MainStackParamList } from '../navigation/types/index';
import { useNewPostModal } from '../post/post-form/index';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ThemedText } from '../ui/themed-text';
import { BASE_URL } from '../../lib/constants';
import { useNewConversationStore } from '../../stores/useNewConversationStore';

export interface GroupShareMenuProps {
  group: GroupWithMeta;
}

export const GroupShareMenu = ({ group }: GroupShareMenuProps) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { openNewPost } = useNewPostModal();
  const { setContt } = useNewConversationStore();

  const groupUrl = `${BASE_URL}/groups/@${group.handle}`;
  const inviteBlurb = t('groups.share.inviteBlurb', { url: groupUrl });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Pressable
          className="p-2"
          accessibilityLabel={t('groups.actions.shareOnCommunity')}
        >
          <ShareIcon size={20} className="text-foreground" />
        </Pressable>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mt-1">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t('groups.actions.shareOnCommunity')}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="flex-row items-center gap-x-2"
            onPress={() =>
              openNewPost({ visibility: 'public', initialContent: inviteBlurb })
            }
          >
            <PencilIcon size={16} className="text-foreground" />
            <ThemedText>{t('groups.share.postToFeed')}</ThemedText>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex-row items-center gap-x-2"
            onPress={() => {
              setContt(inviteBlurb);
              navigation.navigate('SelectPrivateMessageMembers');
            }}
          >
            <SendIcon size={16} className="text-foreground" />
            <ThemedText>{t('groups.share.sendInMessage')}</ThemedText>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t('groups.actions.otherOptions')}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="flex-row items-center gap-x-2"
            onPress={() => {
              Clipboard.setString(groupUrl);
              Toast.show({
                type: 'success',
                text1: t('groups.share.linkCopied'),
              });
            }}
          >
            <LinkIcon size={16} className="text-foreground" />
            <ThemedText>{t('groups.share.copyLink')}</ThemedText>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
