import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  GenericHeader,
  JamParticipantActionSheet,
} from '~/components/custom';
import {
  HandIcon,
  MicOffIcon,
  XIcon,
  MoreHorizontalIcon,
  CopyIcon,
  ShareIcon,
} from '~/components/icons';
import { useOpenpeeps } from '@openpeeps/react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { ThemedText } from '~/components/ui/themed-text';
import { AudienceSetting, Event, Profile } from '@openpeeps/common';
import { Input } from '~/components/ui/input';
import { useParticipants, useRoomContext } from '@livekit/react-native';
import { profileMatchesQuery, truncateText } from '~/lib/utils';
import { LocalParticipant, RemoteParticipant } from 'livekit-client';
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { BASE_URL } from '~/lib/constants';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { MetadataType } from '~/types';
import { useJamStore } from '~/stores/useJamStore';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { VisibilityDisplay } from '~/components/custom/post/pieces/VisibilityDisplay';

export const JamDetails = ({
  route,
  navigation,
}: NativeStackScreenProps<MainStackParamList, 'JamDetails'>) => {
  const { id, tabOption } = route.params;
  const participants = useParticipants();
  const { openpeepsApi } = useOpenpeeps();
  const { data: jamPost, isLoading } = openpeepsApi.usePost(id as string);
  const jamEvent = jamPost?.data as Event;
  const jam = jamEvent?.jam;
  const [tabValue, setTabValue] = useState(tabOption as string);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredJamParticipants, setFilteredJamParticipants] =
    useState<(RemoteParticipant | LocalParticipant)[]>();

  useEffect(() => {
    if (searchQuery) {
      setFilteredJamParticipants(
        participants.filter(participant => {
          const p = JSON.parse(participant.metadata || '{}');
          return profileMatchesQuery(p.profile, searchQuery);
        }),
      );
    } else {
      setFilteredJamParticipants(participants);
    }
  }, [searchQuery, participants]);

  const jamLink = `${BASE_URL}/events/${id}/jam`;

  const getProfile = (p: RemoteParticipant | LocalParticipant) => {
    const meta: MetadataType = JSON.parse(p.metadata || '{}');
    return meta.profile as Profile;
  };

  return (
    <ThemedSafeAreaView className="flex-1 relative">
      <GenericHeader
        hideBackButton={true}
        title="Jam Details"
        rightType="icon"
        rightButtonIcon={<XIcon className="text-foreground" />}
        onRightButtonPress={() => {
          navigation.pop();
        }}
      />
      <Tabs
        onValueChange={setTabValue}
        value={tabValue}
        className="w-full mx-auto flex-col gap-1.5 mt-5">
        <TabsList className="flex-row w-full bg-transparent border-muted rounded-none border-b p-0 px-3">
          <TabsTrigger
            value="people"
            onPress={() => {
              setTabValue('people');
            }}
            className={`${tabValue === 'people' ? 'border-b-2 border-foreground' : ''
              }`}>
            <ThemedText>People</ThemedText>
          </TabsTrigger>
          <TabsTrigger
            value="info"
            className={`${tabValue === 'info' ? 'border-b-2 border-foreground' : ''
              }`}
            onPress={() => {
              setTabValue('info');
            }}>
            <ThemedText>Info</ThemedText>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="people" className="py-4">
          <Input
            className="w-full"
            placeholder="Enter a name or handle"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView className="w-full h-full">
            <ThemedText className="my-4">
              IN JAM ({filteredJamParticipants?.length})
            </ThemedText>
            {filteredJamParticipants?.map((participant, idx) => {
              return <ParticipantCard key={idx} participant={participant} />;
            })}
            {filteredJamParticipants?.length === 0 && (
              <ThemedText className="text-center">
                No Participants found
              </ThemedText>
            )}
            {/* <ThemedText className="my-4">
              IN WAITING ROOM ({filteredJamParticipants?.length})
            </ThemedText>
            {filteredJamParticipants?.map((participant, idx) => {
              return (
                <WaitingRoomParticipantCard
                  key={idx}
                  participant={participant}
                />
              );
            })} */}
            {filteredJamParticipants?.length === 0 && (
              <ThemedText className="text-center">
                No Participants found
              </ThemedText>
            )}
            <ThemedText className="my-4">MODERATORS</ThemedText>
            {filteredJamParticipants
              ?.filter(p => jam?.moderators.includes(getProfile(p).id))
              ?.map((participant, idx) => {
                return <ParticipantCard key={idx} participant={participant} />;
              })}
            {filteredJamParticipants?.filter(p =>
              jam?.moderators.includes(getProfile(p).id),
            ).length === 0 && (
                <ThemedText className="text-center">
                  No Participants found
                </ThemedText>
              )}
            <ThemedText className="my-4">GUESTS</ThemedText>
            {filteredJamParticipants
              ?.filter(
                p =>
                  jam?.audience &&
                  jam?.audience.includes(getProfile(p).id),
              )
              ?.map((participant, idx) => {
                return <ParticipantCard key={idx} participant={participant} />;
              })}
            {filteredJamParticipants?.filter(
              p =>
                jam?.audience &&
                jam?.audience.includes(getProfile(p).id),
            ).length === 0 && (
                <ThemedText className="text-center">
                  No Participants found
                </ThemedText>
              )}
            <View className="pb-6" />
          </ScrollView>
        </TabsContent>
        <TabsContent value="info" className="p-4">
          {isLoading && <ActivityIndicator size={'small'} />}
          <ThemedText className="text-2xl mb-4">Joining Info</ThemedText>
          <ThemedText className="text-2xl mb-4">{jamEvent?.name}</ThemedText>
          <ThemedText className="text-lg mb-4">
            Share this jam link with others you want in it
          </ThemedText>
          <View className="bg-[#111] w-full py-1 pl-2 rounded-lg flex-row justify-between items-center mt-6 mb-4">
            <Text className="text-white" numberOfLines={2}>
              {truncateText(jamLink, 40)}
            </Text>
            <Button
              variant="ghost"
              onPress={() => {
                Clipboard.setString(jamLink);
                Toast.show({
                  type: 'success',
                  text1: 'Link copied to clipboard',
                });
              }}>
              <CopyIcon size={20} color="white" />
            </Button>
          </View>
          <Button className="flex-row gap-x-2 mb-6">
            <ShareIcon className="text-background" />
            <ThemedText>Share invite</ThemedText>
          </Button>
          <ThemedText className="text-2xl mb-4">Jam visibility</ThemedText>
          {jamPost && <VisibilityDisplay audienceSetting={jamPost as AudienceSetting} type="event" />}
        </TabsContent>
      </Tabs>
    </ThemedSafeAreaView>
  );
};

interface ParticipantCardProps {
  participant: RemoteParticipant | LocalParticipant;
}
const ParticipantCard: React.FC<ParticipantCardProps> = ({ participant }) => {
  const { currentProfile, openpeepsApi } = useOpenpeeps();
  const { data: server } = openpeepsApi.useServerInfo();
  const room = useRoomContext();
  const { jam } = useJamStore();
  const participantActionSheetRef = React.useRef<BottomSheetModal>(null);

  const getProfile = (p: RemoteParticipant | LocalParticipant) => {
    const meta: MetadataType = JSON.parse(p.metadata || '{}');
    return meta.profile as Profile;
  };

  const handleParticipantActionModalPress = React.useCallback(() => {
    participantActionSheetRef.current?.present();
  }, []);
  return (
    <>
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row gap-x-2 items-center">
          <Avatar alt="profile" className="size-14">
            {participant && getProfile(participant)?.avatar !== undefined ? (
              <AvatarImage
                source={{
                  uri: getProfile(participant)?.avatar!,
                }}
              />
            ) : (
              <AvatarImage
                source={{
                  uri: server?.communityConfig.theme.defaultProfileAvatar,
                }}
              />
            )}
          </Avatar>
          <ThemedText className="text-lg font-semibold text-foreground">
            {currentProfile?.id === getProfile(participant)?.id
              ? 'You'
              : truncateText(
                getProfile(participant)?.displayName ||
                `@${getProfile(participant)?.handle}`,
                18,
              ) || '-'}
          </ThemedText>
        </View>
        <View className="flex-row gap-x-4 items-center">
          {!participant.isMicrophoneEnabled && (
            <MicOffIcon className="text-foreground" />
          )}
          {JSON.parse(participant.metadata || '{}').handRaised !==
            undefined && <HandIcon className="text-foreground" />}
          {jam?.moderators.includes(room.localParticipant.identity) && (
            <Button
              variant={'ghost'}
              onPress={handleParticipantActionModalPress}
              className="p-2 z-30">
              <MoreHorizontalIcon className="text-foreground" />
            </Button>
          )}
        </View>
        {/* <ThemedText>{JSON.stringify(participant)}</ThemedText> */}
      </View>
      <JamParticipantActionSheet
        participantMetdata={
          JSON.parse(participant.metadata || '{}') as MetadataType
        }
        participant={participant}
        ref={participantActionSheetRef}
      />
    </>
  );
};
