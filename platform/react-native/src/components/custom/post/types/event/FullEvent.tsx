import React, { useCallback, useMemo, useRef } from 'react';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { useOpenpeeps } from '@openpeeps/react';
import {
  CancelEventSheet,
  DeleteEventSheet,
  EmptyStateContainer,
  GenericHeader,
  ProfileCard,
  ReportProfileOrPostSheet,
  ReplyButton,
  OpenPeepsMarkdown,
  ThreadedFeed,
} from '~/components/custom';
import {
  MoreVerticalIcon,
  ShareIcon,
  MapPinIcon,
  LinkIcon,
  PhoneCallIcon,
  Link2Icon,
  SendIcon,
  PencilIcon,
  PencilLineIcon,
  Trash2Icon,
  FlagIcon,
} from '~/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ThemedText } from '~/components/ui/themed-text';
import { Image, View } from 'react-native';
import { Event, PublicPost, Profile, PublicRsvp, Group, GroupData, buildThreads } from '@openpeeps/common';
import { ProfileAvatar } from '~/components/custom/profile/profile-avatar';
import { profileName, truncateText } from '~/lib/utils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { hasValue, groupName } from '~/lib/utils';
import { BASE_URL } from '~/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { useLocalPostStore } from '~/stores/useLocalPostStore';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';
import { calculateEffectiveRsvps } from '~/lib/utils';
import { ThemedView } from '~/components/ui/themed-view';

interface FullEventProps {
  post: PublicPost;
}

export const FullEvent: React.FC<FullEventProps> = ({ post }) => {
  const { currentProfile, openpeepsApi } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { postData, setPostData } = useLocalPostStore();
  const [tabValue, setTabValue] = React.useState('description');
  const { setContt } = useNewConversationStore();

  const group = useMemo(() => post?.group as Group, [post]);
  const event = useMemo(() => post?.data as Event, [post]);

  const rsvps = useMemo<PublicRsvp[]>(() => {
    return calculateEffectiveRsvps(post) || [];
  }, [post]);

  const jamLink = `${BASE_URL}/events/${post?.id}/jam`;

  const onRepostToFeed = () => {
    setPostData({
      ...postData,
      data: {
        ...postData.data,
        type: 'note',
        content: `Join our event happening at ${BASE_URL}/post/${post?.id}`,
      },
    });
    navigation.navigate('TabNavigator', {
      screen: 'NewPost',
      params: {
        withContent: true,
      },
    });
  };
  const onSendToMessage = () => {
    setContt(`Join our event happening at ${BASE_URL}/post/${post?.id}`);
    navigation.navigate('SelectPrivateMessageMembers');
  };

  const shouldShowAttendees =
    post?.type === 'event' && rsvps && rsvps.length > 0;

  let postContextQuery = openpeepsApi.usePostContext(post.id);

  let descendentThreads = useMemo(() =>
    (postContextQuery.data && buildThreads(postContextQuery.data.descendants)) || [],
    [postContextQuery.data]);

  return (
    <ThemedView className="flex-1 relative px-4 pb-4">
      <View className="w-full h-[250px] mx-auto">
        <Image
          source={
            event?.image
              ? { uri: event?.image }
              : require('~/assets/images/event-placeholder.png')
          }
          className="w-full h-full rounded-md"
        />
      </View>

      <View className="w-full flex-row items-center gap-x-2 py-4">
        <View className="flex-1">
          <View className="flex flex-row gap-x-4">
            <View className="px-3 py-1 bg-muted rounded-lg mb-3">
              <ThemedText>
                {post?.groupId ? '✨ Group Event' : '✨ Community Event'}
              </ThemedText>
            </View>
            {/* <View className="px-3 py-1 bg-muted rounded-lg mb-3">
                <ThemedText>
                  {(event?.maxAttendees || 0) - (attendees?.length || 0)} slots
                  left
                </ThemedText>
              </View> */}
          </View>
          {post?.groupId && (
            <View>
              <ThemedText className="text-xl text-muted-foreground">
                {groupName(group as GroupData)}
              </ThemedText>
            </View>
          )}
        </View>
        <View className="flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="px-2">
              <ShareIcon className="text-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className=" mt-1">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={onRepostToFeed}>
                  <PencilIcon className="text-muted-foreground" size={18} />
                  <ThemedText>Repost to feed</ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={onSendToMessage}>
                  <SendIcon className="text-muted-foreground" size={18} />
                  <ThemedText>Send in a message</ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={() => {
                    Clipboard.setString(jamLink);
                    Toast.show({
                      type: 'success',
                      text1: 'Link copied to clipboard',
                    });
                  }}>
                  <Link2Icon className="text-muted-foreground" size={18} />
                  <ThemedText>Copy link</ThemedText>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </View>
      </View>
      <ThemedText className="text-xl font-semibold mb-2">
        {event?.name || 'Untitled Event'}
      </ThemedText>
      <View className="flex-row items-center gap-x-2 mt-2">
        <ProfileAvatar
          profile={post?.profile as Profile}
          className="size-6"
        />
        <ThemedText className="text-muted-foreground">
          Hosted by
          {currentProfile?.id === post?.profile?.id
            ? ' You'
            : ` ${profileName(post?.profile)}`}
        </ThemedText>
      </View>
      {event?.start && (
        <View className="mt-8 flex-row gap-x-4">
          <View className="border-foreground/20 border-[0.5px] rounded-md px-3 py-1">
            <ThemedText className="text-center">
              {new Date(event?.start || '').toLocaleString('en-US', {
                month: 'short',
              })}
            </ThemedText>
            <ThemedText className="text-center ">
              {new Date(event?.start || '').getDate()}
            </ThemedText>
          </View>
          <View>
            <ThemedText className="text-xl">
              {new Date(event?.start || '').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </ThemedText>
            <ThemedText className="text-muted-foreground mt-2">
              {new Date(event?.start || '').toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: event?.end ? undefined : 'short',
              })}
              {`${event?.end ? ' - ' : ''}`}
              {event?.end &&
                new Date(event?.end || '').toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
            </ThemedText>
          </View>
        </View>
      )}
      <View className="mt-8 flex-row gap-x-4">
        <View className="border-foreground/20 border-[0.5px] flex items-center justify-center rounded-md px-4 py-1">
          {event?.physicalLocation ? (
            <MapPinIcon className="text-muted-foreground my-3" size={18} />
          ) : event?.jam ? (
            <PhoneCallIcon className="text-muted-foreground" size={18} />
          ) : event?.url ? (
            <LinkIcon className="text-muted-foreground" size={18} />
          ) : null}
        </View>
        <View>
          {event?.physicalLocation ? (
            <>
              <ThemedText className="text-xl">
                {event?.physicalLocation.text || 'Physical Location'}
              </ThemedText>
            </>
          ) : event?.jam ? (
            <>
              <ThemedText className="text-xl">Jam Event</ThemedText>
              <ThemedText className="text-muted-foreground mt-2">
                {truncateText(jamLink, 30)}
              </ThemedText>
            </>
          ) : event?.url ? (
            <>
              <ThemedText className="text-xl">External Event</ThemedText>
              <ThemedText className="text-muted-foreground mt-2">
                {truncateText(event?.url, 40)}
              </ThemedText>
            </>
          ) : null}
        </View>
      </View>
      <RegistrationButtion post={post as PublicPost} />
      <Tabs
        onValueChange={setTabValue}
        value={tabValue}
        className="w-full mx-auto flex-col gap-1.5 mt-5">
        <TabsList className="flex-row w-full bg-transparent border-muted rounded-none border-b p-0 px-3">
          <TabsTrigger
            value="description"
            onPress={() => {
              setTabValue('description');
            }}
            className={`${tabValue === 'description'
              ? 'border-b-2 border-foreground'
              : ''
              }`}>
            <ThemedText>Description</ThemedText>
          </TabsTrigger>
          <TabsTrigger
            value="discussions"
            className={`${tabValue === 'discussions'
              ? 'border-b-2 border-foreground'
              : ''
              }`}
            onPress={() => {
              setTabValue('discussions');
            }}>
            <ThemedText>Discussions</ThemedText>
          </TabsTrigger>
          {shouldShowAttendees && (
            <TabsTrigger
              value="attendees"
              className={`${tabValue === 'attendees'
                ? 'border-b-2 border-foreground'
                : ''
                }`}
              onPress={() => {
                setTabValue('attendees');
              }}>
              <ThemedText>Attendees</ThemedText>
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="description" className="p-0">
          {event?.content ? (
            <OpenPeepsMarkdown source={event?.content} linkPreviewMode="none" />
          ) : (
            <EmptyStateContainer type="event-description" />
          )}
        </TabsContent>
        <TabsContent value="discussions" className="flex-1 p-0">
          <ReplyButton post={post} />
          {descendentThreads.map(thread =>
            <ThreadedFeed key={thread.id} thread={thread} />
          )}
        </TabsContent>
        {shouldShowAttendees && (
          <TabsContent value="attendees" className="px-0 py-4">
            {rsvps && rsvps?.length === 0 && (
              <EmptyStateContainer type="event-attendees" />
            )}
            {rsvps &&
              rsvps?.map((rsvp, idx) => (
                <ProfileCard
                  key={idx}
                  profile={rsvp.profile}
                  rightComponent={
                    <View className=" flex  items-center justify-center">
                      <ThemedText className="text-muted-foreground">
                        {rsvp.response}
                      </ThemedText>
                    </View>
                  }
                />
              ))}
          </TabsContent>
        )}
      </Tabs>
    </ThemedView>
  );
};

const RegistrationButtion: React.FC<{
  post: PublicPost;
}> = ({ post }) => {
  const { t } = useTranslation();

  const { currentProfile, openpeepsApi } = useOpenpeeps();
  const [isRegistering, setIsRegistering] = React.useState(false);
  const myRsvp =
    post &&
    calculateEffectiveRsvps(post).find(
      r => r.profile.id === currentProfile?.id,
    );

  const myEvent = post?.profile?.id === currentProfile?.id;

  const rsvpToEvent = openpeepsApi.rsvpToEventAction({ id: post?.id as string });

  const handleRegisterForEvent = async () => {
    try {
      setIsRegistering(true);
      const response = await rsvpToEvent({ response: 'yes' });
      if (response) {
        Toast.show({
          type: 'success',
          text1: t('posts.rsvp.success'),
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('posts.rsvp.error'),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('posts.rsvp.error', { error: error }),
      });
    } finally {
      setIsRegistering(false);
    }
  };
  const handleMaybeForEvent = () => {
    setIsRegistering(true);
    rsvpToEvent({ response: 'tentative' })
      .then(res => {
        if (res) {
          Toast.show({
            type: 'success',
            text1: t('posts.rsvp.success'),
          });
        } else {
          Toast.show({
            type: 'error',
            text1: t('posts.rsvp.error'),
          });
        }
      })
      .catch(err => {
        Toast.show({
          type: 'error',
          text1: t('posts.rsvp.error', { error: err.message }),
        });
      })
      .finally(() => {
        setIsRegistering(false);
      });
  };

  const handleNoForEvent = () => {
    setIsRegistering(true);
    rsvpToEvent({ response: 'no' })
      .then(res => {
        if (res) {
          Toast.show({
            type: 'success',
            text1: t('posts.rsvp.success'),
          });
        } else {
          Toast.show({
            type: 'error',
            text1: t('posts.rsvp.error'),
          });
        }
      })
      .catch(err => {
        Toast.show({
          type: 'error',
          text1: t('posts.rsvp.error', { error: err.message }),
        });
      })
      .finally(() => {
        setIsRegistering(false);
      });
  };

  if (myEvent) {
    return null;
  }

  return (
    <View className="mt-5 w-full">
      {myRsvp && myRsvp.response !== 'no' ? (
        <Button
          onPress={handleNoForEvent}
          disabled={isRegistering}
          variant={'outline'}>
          <ThemedText className="text-destructive">
            {isRegistering
              ? t('common.form.loading')
              : t('posts.rsvp.cancelRegistration')}
          </ThemedText>
        </Button>
      ) : (
        <View className="flex-row items-center w-full gap-x-4">
          <Button
            onPress={async () => handleRegisterForEvent().catch(() => { })}
            className="w-[60%]">
            <ThemedText>
              {isRegistering
                ? t('common.form.loading')
                : t('posts.rsvp.register')}
            </ThemedText>
          </Button>
          <Button
            onPress={handleMaybeForEvent}
            variant={'ghost'}
            className="bg-muted-foreground/20">
            <ThemedText className="text-muted-foreground">
              {isRegistering ? t('common.form.loading') : t('posts.rsvp.maybe')}
            </ThemedText>
          </Button>
          <Button onPress={handleNoForEvent} variant={'outline'}>
            <ThemedText className="text-destructive">
              {isRegistering ? t('common.form.loading') : t('posts.rsvp.no')}
            </ThemedText>
          </Button>
        </View>
      )}
    </View>
  );
};

export const FullEventActions: React.FC<{
  post: PublicPost;
}> = ({ post }) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const cancelEventRef = useRef<BottomSheetModal>(null);
  const deleteEventRef = useRef<BottomSheetModal>(null);
  const reportPostModalRef = useRef<BottomSheetModal>(null);
  const event = post?.data as Event;
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const deletePost = openpeepsApi.deletePostAction({
    id: post?.id,
  });

  const handleDelete = async () => {
    deletePost().then(res => {
      if (res) {
        Toast.show({
          type: 'success',
          text1: t('posts.delete.success'),
        });
        navigation.goBack();
      } else {
        Toast.show({
          type: 'error',
          text1: t('posts.delete.error'),
        });
      }
    });
  };

  const handleDeleteModalPress = useCallback(() => {
    deleteEventRef.current?.present();
  }, []);

  const handleReportPostModalPress = useCallback(() => {
    reportPostModalRef.current?.present();
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="px-2">
          <MoreVerticalIcon className="text-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className=" mt-1">
          {currentProfile?.id === post?.profile?.id ? (
            <>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={() => {
                    navigation.navigate('EditEvent', {
                      id: post?.id,
                    });
                  }}>
                  <PencilLineIcon className="text-foreground" size={18} />
                  <ThemedText>Edit</ThemedText>
                </DropdownMenuItem>
                {/* <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={handleCancelModalPress}>
                  <CalendarXIcon className="text-foreground" size={18} />
                  <ThemedText>Cancel</ThemedText>
                </DropdownMenuItem> */}
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={handleDeleteModalPress}>
                  <Trash2Icon className="text-destructive" size={18} />
                  <ThemedText className="text-destructive">Delete</ThemedText>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : (
            <DropdownMenuGroup>
              {event?.moderators?.includes(currentProfile?.id as string) && (
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={() => { }}>
                  <PencilLineIcon className="text-foreground" size={18} />
                  <ThemedText>Edit</ThemedText>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="flex-row gap-x-2 items-center"
                onPress={handleReportPostModalPress}>
                <FlagIcon className="text-destructive" size={18} />
                <ThemedText className="text-destructive">Report</ThemedText>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CancelEventSheet ref={cancelEventRef} onCancel={async () => { }} />
      <DeleteEventSheet ref={deleteEventRef} onDelete={handleDelete} />
      <ReportProfileOrPostSheet
        ref={reportPostModalRef}
        post={post}
        reportType="post"
      />
    </>
  );
};
