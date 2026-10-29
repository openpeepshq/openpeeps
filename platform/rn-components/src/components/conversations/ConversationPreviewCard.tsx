import { View, TouchableOpacity } from 'react-native';
import React, { useCallback, useRef, useState } from 'react';
import { UpdatingDate } from '../custom/date/updating-date';
import { OpenpeepsMarkdown } from '../markdown/OpenpeepsMarkdown';
import {
  formatBadgeCount,
  isConversationLeaveMarker,
  profileName,
  truncateText,
  type PublicPost,
} from '@openpeepshq/common';
import { Text } from '../ui/text';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import {
  BellOffIcon,
  FlagIcon,
  Trash2Icon,
  CalendarIcon,
} from '../icons/index';
import { useOpenpeeps } from '@openpeepshq/react';
import { ProfileAvatar } from '../profile/Avatar';
import { ConversationParticipantsModal } from './ConversationParticipantsModal';
import { useTranslation } from 'react-i18next';

interface ConversationPreviewCardProps {
  conversation: PublicPost[];
  onPress: () => void;
  onLongPress?: () => void;
  unreadCount?: number;
}

export const ConversationPreviewCard = ({
  conversation,
  onPress,
  onLongPress,
  unreadCount = 0,
}: ConversationPreviewCardProps) => {
  const { t } = useTranslation();
  const deleteMessageModalRef = useRef<BottomSheetModal>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const { currentProfile } = useOpenpeeps();

  const lastMessage = conversation?.slice(-1)[0];
  const participants = lastMessage?.audience || [];
  const leaveMarker = !!lastMessage && isConversationLeaveMarker(lastMessage);

  const otherParticipants = participants.filter(
    (p) => p.id !== currentProfile?.id
  );

  const otherNames = otherParticipants
    .map((p) => p.displayName || `@${p.handle}`)
    .join(', ');
  const title = otherNames
    ? t('conversations.titleWithYou', {
        defaultValue: '{{names}} and You',
        names: otherNames,
      })
    : t('common.you', { defaultValue: 'You' });

  const handleDeleteGroupModalPress = useCallback(() => {
    deleteMessageModalRef.current?.present();
  }, []);

  if (!lastMessage) return null;

  return (
    <DropdownMenu>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        className="w-full mb-3"
      >
        <View className="flex w-full flex-col gap-x-1 border-b p-3 text-left">
          <View className="flex flex-row items-center gap-4">
            <View className="flex-row -space-x-2">
              {participants.slice(0, 3).map((p) => (
                <ProfileAvatar
                  key={p.id}
                  profile={p}
                  className="size-10 border-0"
                />
              ))}
            </View>
            <View className="flex min-w-0 flex-1 flex-row items-center gap-2">
              <Text className="truncate font-bold">
                {truncateText(title, 20)}
              </Text>
              {unreadCount > 0 ? (
                <View className="bg-destructive size-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1">
                  <Text className="text-xs font-semibold text-destructive-foreground">
                    {formatBadgeCount(unreadCount)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <UpdatingDate
            date={lastMessage.createdAt}
            className="text-muted-foreground"
          />

          <View className="mt-2 flex flex-row items-start gap-x-2">
            {leaveMarker ? (
              <Text>
                {t('conversations.messageInThread.left', {
                  name: profileName(lastMessage.profile),
                })}
              </Text>
            ) : (
              <>
                <View className="flex flex-row items-center">
                  <Text>~</Text>
                  {currentProfile?.id === lastMessage.profile.id ? (
                    <Text className="ml-1">Me</Text>
                  ) : (
                    <Text className="ml-1">
                      @{truncateText(lastMessage.profile.handle, 8)}
                    </Text>
                  )}
                  <Text className="mx-1">:</Text>
                </View>
                {lastMessage.data?.type === 'event' ? (
                  <View className="flex flex-row items-center gap-1">
                    <CalendarIcon size={16} className="text-muted-foreground" />
                    <Text>{(lastMessage.data as { name?: string }).name}</Text>
                  </View>
                ) : (
                  <OpenpeepsMarkdown
                    source={lastMessage.data?.content || ''}
                    linkPreviewMode="none"
                  />
                )}
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
      <DropdownMenuContent>
        <DropdownMenuItem onPress={() => console.log('Mute conversation')}>
          <BellOffIcon size={18} className=" mr-2 text-foreground" />
          <Text>Mute conversation</Text>
        </DropdownMenuItem>

        <DropdownMenuItem onPress={() => console.log('Report conversation')}>
          <FlagIcon size={18} className="mr-2 text-foreground" />
          <Text>Report conversation</Text>
        </DropdownMenuItem>

        <DropdownMenuItem
          onPress={handleDeleteGroupModalPress}
          className="text-destructive focus:text-destructive"
        >
          <Trash2Icon size={18} className=" mr-2 text-destructive" />
          <Text className="text-destructive">Delete conversation</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
      {participants.length > 2 && (
        <ConversationParticipantsModal
          open={participantsOpen}
          onOpenChange={setParticipantsOpen}
          participants={participants}
        />
      )}
    </DropdownMenu>
  );
};
