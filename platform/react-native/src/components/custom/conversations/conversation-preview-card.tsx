import { View, TouchableOpacity } from 'react-native';
import React, { useCallback, useRef } from 'react';
import { UpdatingDate } from '../date/updating-date';
import { OpenPeepsMarkdown } from '../markdown/OpenPeepsMarkdown';
import { PublicPost } from '@openpeeps/common';
import { Text } from '../../ui/text';
import { Button } from '../../ui/button';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../ui/dropdown-menu';
import { BellOffIcon, FlagIcon, Trash2Icon } from '../../icons';
import { useOpenpeeps } from '@openpeeps/react';
import {
  ProfileSheet,
  ParticipantsSheet,
} from '../modals';
import { ProfileImages, ProfileName } from '../common/profile-pieces';
import { truncateText } from '../../../lib/utils';
interface ConversationPreviewCardProps {
  conversation: PublicPost[];
  onPress: () => void;
  onLongPress?: () => void;
}

export const ConversationPreviewCard = ({
  conversation,
  onPress,
  onLongPress,
}: ConversationPreviewCardProps) => {
  const profileSheetRef = useRef<BottomSheetModal>(null);
  const deleteMessageModalRef = useRef<BottomSheetModal>(null);
  const { currentProfile } = useOpenpeeps();

  const lastMessage = conversation?.slice(-1)[0];
  const participants = lastMessage?.audience || [];

  const otherParticipants = participants.filter(
    p => p.id !== currentProfile?.id,
  );

  const handleProfilePress = useCallback(() => {
    profileSheetRef.current?.present();
  }, []);

  const handleDeleteGroupModalPress = useCallback(() => {
    deleteMessageModalRef.current?.present();
  }, []);

  return (
    <DropdownMenu>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        className="w-full mb-3">
        <View className="flex w-full flex-row items-center justify-between p-4">
          <Button
            variant={'ghost'}
            size={'icon'}
            className="rounded-full -mt-4"
            onPress={handleProfilePress}>
            <ProfileImages profile={participants} />
          </Button>
          <View className="flex-1 ml-5">
            <View className="flex-row justify-between items-center">
              <ProfileName
                profile={
                  participants.length === 2
                    ? participants.filter(p => p.id !== currentProfile?.id)
                    : participants
                }
              />
            </View>
            <View className="flex-row gap-1">
              <Text className="">{lastMessage.profile.handle}</Text>
              <UpdatingDate date={lastMessage.createdAt} />
            </View>
          </View>
        </View>
        <View className="px-4">
          <OpenPeepsMarkdown
            source={truncateText(lastMessage.data?.content, 70) || ''}
            linkPreviewMode="none"
          />
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
          className="text-destructive focus:text-destructive">
          <Trash2Icon size={18} className=" mr-2 text-destructive" />
          <Text className="text-destructive">Delete conversation</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
      {participants.length === 2 && otherParticipants.length > 0 && (
        <ProfileSheet
          ref={profileSheetRef}
          profile={otherParticipants}
          onConnect={() => {
            console.log('Connect pressed');
            profileSheetRef.current?.dismiss();
          }}
        />
      )}
      {participants.length > 2 && (
        <ParticipantsSheet ref={profileSheetRef} participants={participants} />
      )}
    </DropdownMenu>
  );
};
