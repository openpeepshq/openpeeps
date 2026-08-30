import {
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  View,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { ThemedView } from '~/components/ui/themed-view';
import {
  GenericHeader,
  OpenPeepsMarkdown,
  UpdatingDate,
} from '~/components/custom';
import {
  XIcon,
  MoreHorizontalIcon,
  SendHorizonalIcon,
  LoaderIcon,
} from '~/components/icons';
import { useOpenpeeps } from '@openpeepshq/react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { JamEvent, PublicProfile } from '@openpeepshq/common';
import { ThemedText } from '~/components/ui/themed-text';
import { truncateText } from '~/lib/utils';
import { useChat, useLocalParticipant, useParticipants } from '@livekit/react-native';
import { MetadataType } from '~/types';
import uuid from 'react-native-uuid';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { ProfileAvatar } from '~/components/custom/profile/profile-avatar';

export const InJamChat = ({
  route,
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'InJamChat'>) => {
  const { id } = route.params;
  const { openpeepsApi } = useOpenpeeps();
  const [content, setContent] = useState('');
  const { data, isLoading, refetch } = openpeepsApi.useJamEvents(id);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const sendMessage = openpeepsApi.createJamEventAction({ id: id });
  const [isSending, setIsSending] = useState(false);
  const [jamEvents, setJamEvents] = useState<JamEvent[]>();
  const { send } = useChat();
  const localParticipant = useLocalParticipant();
  const participants = useParticipants();
  const mentionProfiles = React.useMemo(() => {
    const byId = new Map<string, PublicProfile>();
    for (const participant of participants) {
      try {
        const profile = (
          JSON.parse(participant.metadata || '{}') as MetadataType
        ).profile as PublicProfile | undefined;
        if (profile?.id && profile.handle) {
          byId.set(profile.id, profile);
        }
      } catch {
        // ignore malformed participant metadata
      }
    }
    return [...byId.values()];
  }, [participants]);
  const localParticipantProfile = (
    JSON.parse(
      localParticipant.localParticipant.metadata || '{}',
    ) as MetadataType
  ).profile as PublicProfile;

  const handleSendMessage = () => {
    setIsSending(true);
    const messageBody = {
      content: content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type: 'message' as
        | 'message'
        | 'reaction'
        | 'start'
        | 'join'
        | 'leave'
        | 'close',
      id: uuid.v4(),
      jamId: id,
      profileId: localParticipantProfile.id,
      sender: {
        profile: localParticipantProfile,
        participantId: localParticipant.localParticipant.identity,
      },
    };
    sendMessage({
      ...messageBody,
    })
      .then(() => {
        send(JSON.stringify(messageBody));
        refetch().then(() => { });
        setContent('');
        scrollViewRef.current?.scrollToEnd({ animated: true });
      })
      .catch(err => {
        console.log(err);
      })
      .finally(() => setIsSending(false));
  };

  useEffect(() => {
    setJamEvents(
      data
        ?.filter(
          m =>
            m.type === 'start' ||
            m.type === 'message' ||
            m.type === 'join' ||
            m.type === 'leave' ||
            m.type === 'close',
        )
        ?.reverse(),
    );
  }, [data]);

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader
        hideBackButton={true}
        title="In-jam messages"
        rightType="icon"
        rightButtonIcon={<XIcon className="text-foreground" />}
        onRightButtonPress={() => {
          navigation.pop();
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {isLoading && <ActivityIndicator size={'small'} />}
        <ScrollView
          ref={scrollViewRef}
          className="p-2 w-full flex-1"
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }>
          {jamEvents?.map((message, idx) => (
            <JamMessageCard
              key={idx}
              jamEvent={message}
              mentionProfiles={mentionProfiles}
            />
          ))}
        </ScrollView>
        <ThemedView className="flex-row items-center p-2 border-t border-border bg-background">
          <TextInput
            className="flex-1 px-4 py-2 pb-4 text-lg text-foreground bg-surface rounded-2xl mx-2"
            placeholder="Type a message..."
            multiline
            value={content}
            onChangeText={setContent}
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!content.trim() || isSending}
            className={`p-2 rounded-full ${content.trim() ? 'bg-primary' : 'bg-surface'
              }`}>
            {isSending ? (
              <ActivityIndicator size={'small'} />
            ) : (
              <SendHorizonalIcon />
            )}
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedSafeAreaView>
  );
};

interface JamMessageCardProps {
  jamEvent: JamEvent;
  mentionProfiles: PublicProfile[];
}

const JamMessageCard: React.FC<JamMessageCardProps> = ({
  jamEvent,
  mentionProfiles,
}) => {
  const { currentProfile, openpeepsApi } = useOpenpeeps();

  const { data: profile, isLoading } = openpeepsApi.useProfile(jamEvent.profileId);

  // Attendance event types
  const attendanceMap: Record<string, string> = {
    join: 'joined',
    leave: 'left',
    start: 'started',
    close: 'ended',
  };

  if (isLoading) {
    return (
      <View className="items-center justify-center py-2">
        <LoaderIcon size={16} className="animate-spin text-muted-foreground" />
      </View>
    );
  }

  if (jamEvent.type in attendanceMap) {
    return (
      <ThemedText className="text-center text-muted-foreground mb-4">
        {profile?.displayName || `@${profile?.handle}`}{' '}
        {attendanceMap[jamEvent.type]} the jam
      </ThemedText>
    );
  }

  if (jamEvent.type === 'message') {
    return (
      <View className="px-2 mb-4">
        <View className="flex-row justify-between items-center">
          <View className="flex-row gap-x-2 items-center">
            <ProfileAvatar
              profile={profile as PublicProfile}
              className="size-12"
            />
            <ThemedText>
              {currentProfile?.id === profile?.id
                ? 'You'
                : truncateText(
                  profile?.displayName || `@${profile?.handle}`,
                  20,
                )}
            </ThemedText>
            <UpdatingDate date={jamEvent.createdAt} />
          </View>
          <MoreHorizontalIcon className="text-foreground" />
        </View>
        <View className="ml-4">
          <OpenPeepsMarkdown
            source={jamEvent?.content || ''}
            mentions={mentionProfiles.map(item => ({ profile: item }))}
          />
        </View>
      </View>
    );
  }
  return null;
};
