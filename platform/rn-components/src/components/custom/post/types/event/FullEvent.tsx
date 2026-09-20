import React, { useCallback, useMemo, useRef } from 'react';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { useOpenpeeps } from '@openpeepshq/react';
import {
  CancelEventSheet,
  DeleteEventSheet,
  EmptyStateContainer,
  EventRsvpScopeSheet,
  GenericHeader,
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
import {
  Event,
  PublicPost,
  Profile,
  Group,
  GroupData,
  buildThreads,
} from '@openpeepshq/common';
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
import {
  canManageEventRsvps,
  countYesRsvps,
  displayRsvpForProfile,
  isCapacityEvent,
  recurringEventHasOpenOccurrence,
} from '~/lib/utils';
import { bottomSheetPresent } from '~/lib/bottom-sheet-ref';
import {
  defaultRsvpRecurrenceId,
  effectiveEventTimes,
  eventTimeZoneOptions,
  formatEventClockTime,
  formatEventRecurrence,
  isRecurringEvent,
  listRsvpOccurrences,
  upsertEventException,
} from '@openpeepshq/common/lib';
import { ThemedView } from '~/components/ui/themed-view';
import { EventOccurrenceList } from './EventOccurrenceList';
import { EventRsvpList } from './EventRsvpList';

interface FullEventProps {
  post: PublicPost;
  occurrence?: string;
}

export const FullEvent: React.FC<FullEventProps> = ({ post, occurrence }) => {
  const { t } = useTranslation();
  const { currentProfile, openpeepsApi } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { postData, setPostData } = useLocalPostStore();
  const [tabValue, setTabValue] = React.useState('description');
  const { setContt } = useNewConversationStore();

  const group = useMemo(() => post?.group as Group, [post]);
  const event = useMemo(() => post?.data as Event, [post]);

  const canManageRsvps = canManageEventRsvps(currentProfile, post);
  const slotsLeft =
    isCapacityEvent(event) &&
    event.maxAttendees !== undefined &&
    (!event.recurrence || occurrence)
      ? event.maxAttendees - countYesRsvps(post, occurrence)
      : null;
  const rsvpManage = openpeepsApi.rsvpManageAction();
  const times = effectiveEventTimes(event, occurrence);
  const tz = eventTimeZoneOptions(event?.timeZone);
  const recurrenceLabel = event?.recurrence
    ? formatEventRecurrence(event.recurrence, t, event.start)
    : '';
  const upcomingOccurrences = event?.recurrence
    ? listRsvpOccurrences(event)
    : [];

  const jamLink = occurrence
    ? `${BASE_URL}/events/${post?.id}/jam?occurrence=${encodeURIComponent(occurrence)}`
    : `${BASE_URL}/events/${post?.id}/jam`;

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

  const shouldShowAttendees = post?.type === 'event';

  let postContextQuery = openpeepsApi.usePostContext(post.id);

  let descendentThreads = useMemo(
    () =>
      (postContextQuery.data &&
        buildThreads(postContextQuery.data.descendants)) ||
      [],
    [postContextQuery.data]
  );

  const eventScope = useMemo(() => {
    if (post?.visibility === 'public') {
      return t('events.public');
    }
    if (post?.groupId) {
      return t('events.group');
    }
    if (post?.visibility === 'direct') {
      return t('events.private');
    }
    return t('events.community');
  }, [post?.groupId, post?.audience, t]);

  return (
    <ThemedView className="flex-1 relative px-4 pb-4">
      <View className="w-full aspect-video mx-auto overflow-hidden rounded-md">
        <Image
          source={
            event?.image
              ? { uri: event?.image }
              : require('~/assets/images/event-placeholder.png')
          }
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      <View className="w-full flex-row items-center gap-x-2 py-4">
        <View className="flex-1">
          <View className="flex flex-row gap-x-4">
            <View className="px-3 py-1 bg-surface rounded-lg mb-3">
              <ThemedText>{eventScope}</ThemedText>
            </View>
            {slotsLeft !== null ? (
              <View className="px-3 py-1 bg-surface rounded-lg mb-3">
                <ThemedText>
                  {slotsLeft <= 0
                    ? t('events.noSpotsAvailable')
                    : t('events.slotsLeft', { count: slotsLeft })}
                </ThemedText>
              </View>
            ) : null}
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
                  onPress={onRepostToFeed}
                >
                  <PencilIcon className="text-muted-foreground" size={18} />
                  <ThemedText>Repost to feed</ThemedText>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={onSendToMessage}
                >
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
                  }}
                >
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
        <ProfileAvatar profile={post?.profile as Profile} className="size-6" />
        <ThemedText className="text-muted-foreground">
          Hosted by
          {currentProfile?.id === post?.profile?.id
            ? ' You'
            : ` ${profileName(post?.profile)}`}
        </ThemedText>
      </View>
      {times.start && (
        <View className="mt-8 flex-row gap-x-4">
          <View className="border-foreground/20 border-[0.5px] rounded-md px-3 py-1">
            <ThemedText className="text-center">
              {new Date(times.start).toLocaleString('en-US', {
                month: 'short',
                ...tz,
              })}
            </ThemedText>
            <ThemedText className="text-center ">
              {new Date(times.start).toLocaleString('en-US', {
                day: 'numeric',
                ...tz,
              })}
            </ThemedText>
          </View>
          <View>
            <ThemedText className="text-xl">
              {new Date(times.start).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                ...tz,
              })}
            </ThemedText>
            <ThemedText className="text-muted-foreground mt-2">
              {formatEventClockTime(times.start, {
                timeZone: event?.timeZone,
                locale: 'en-US',
              })}
              {times.end
                ? ` - ${formatEventClockTime(times.end, {
                    timeZone: event?.timeZone,
                    locale: 'en-US',
                  })}`
                : ''}
              {tz.timeZone ? ` (${tz.timeZone})` : ''}
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
                {event?.physicalLocation.text ||
                  t('events.location.physical', {
                    defaultValue: 'Physical Location',
                  })}
              </ThemedText>
            </>
          ) : event?.jam ? (
            <>
              <ThemedText className="text-xl">
                {t('events.location.jam', { defaultValue: 'Jam Event' })}
              </ThemedText>
              <ThemedText className="text-muted-foreground mt-2">
                {truncateText(jamLink, 30)}
              </ThemedText>
            </>
          ) : event?.url ? (
            <>
              <ThemedText className="text-xl">
                {t('events.location.external', {
                  defaultValue: 'External Event',
                })}
              </ThemedText>
              <ThemedText className="text-muted-foreground mt-2">
                {truncateText(event?.url, 40)}
              </ThemedText>
            </>
          ) : null}
        </View>
      </View>
      {event?.recurrence ? (
        <EventOccurrenceList
          post={post as PublicPost}
          postId={post.id}
          occurrences={upcomingOccurrences}
          currentOccurrenceId={occurrence}
          recurrenceLabel={recurrenceLabel}
        />
      ) : null}
      <RegistrationButtion
        post={post as PublicPost}
        recurrenceId={occurrence}
      />
      <Tabs
        onValueChange={setTabValue}
        value={tabValue}
        className="w-full mx-auto flex-col gap-1.5 mt-5"
      >
        <TabsList className="flex-row w-full bg-transparent border-muted rounded-none border-b p-0 px-3">
          <TabsTrigger
            value="description"
            onPress={() => {
              setTabValue('description');
            }}
            className={`${
              tabValue === 'description' ? 'border-b-2 border-foreground' : ''
            }`}
          >
            <ThemedText>Description</ThemedText>
          </TabsTrigger>
          <TabsTrigger
            value="discussions"
            className={`${
              tabValue === 'discussions' ? 'border-b-2 border-foreground' : ''
            }`}
            onPress={() => {
              setTabValue('discussions');
            }}
          >
            <ThemedText>Discussions</ThemedText>
          </TabsTrigger>
          {shouldShowAttendees && (
            <TabsTrigger
              value="attendees"
              className={`${
                tabValue === 'attendees' ? 'border-b-2 border-foreground' : ''
              }`}
              onPress={() => {
                setTabValue('attendees');
              }}
            >
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
          {descendentThreads.map((thread) => (
            <ThreadedFeed key={thread.id} thread={thread} />
          ))}
        </TabsContent>
        {shouldShowAttendees && (
          <TabsContent value="attendees" className="px-0 py-4">
            <EventRsvpList
              post={post as PublicPost}
              occurrenceId={occurrence}
              occurrences={upcomingOccurrences}
              canManageRsvps={canManageRsvps}
              onManage={(response, profileId, recurrenceId) =>
                rsvpManage(
                  { response, recurrenceId },
                  { id: post.id, profileId }
                )
              }
            />
          </TabsContent>
        )}
      </Tabs>
    </ThemedView>
  );
};

const RegistrationButtion: React.FC<{
  post: PublicPost;
  recurrenceId?: string;
}> = ({ post, recurrenceId }) => {
  const { t } = useTranslation();
  const { currentProfile, openpeepsApi } = useOpenpeeps();
  const [isRegistering, setIsRegistering] = React.useState(false);
  const [pending, setPending] = React.useState<
    'yes' | 'tentative' | 'no' | null
  >(null);
  const [scopeError, setScopeError] = React.useState<string | null>(null);
  const scopeSheetRef = useRef<BottomSheetModal>(null);
  const eventData = post.data?.type === 'event' ? post.data : undefined;
  const recurring = eventData ? isRecurringEvent(eventData) : false;
  const defaultId = eventData
    ? defaultRsvpRecurrenceId(eventData, recurrenceId)
    : undefined;
  const occurrences =
    eventData && recurring ? listRsvpOccurrences(eventData) : [];
  const capacityEvent = eventData ? isCapacityEvent(eventData) : false;
  const atCapacity =
    capacityEvent &&
    eventData?.maxAttendees !== undefined &&
    (recurring
      ? !recurringEventHasOpenOccurrence(post, currentProfile?.id)
      : countYesRsvps(post, defaultId) >= eventData.maxAttendees);

  const myRsvp =
    post && currentProfile
      ? displayRsvpForProfile(post, currentProfile.id, { recurrenceId })
      : undefined;

  const myEvent = post?.profile?.id === currentProfile?.id;
  const full = atCapacity && myRsvp?.response !== 'yes';

  const rsvpToEvent = openpeepsApi.rsvpToEventAction({
    id: post?.id as string,
  });

  const showRsvpError = (error: unknown) => {
    const errorKey =
      (error as { errorKey?: string })?.errorKey ??
      (error as { key?: string })?.key;
    const message = errorKey ? t(errorKey) : t('posts.rsvp.error');
    setScopeError(message);
    Toast.show({
      type: 'error',
      text1: message,
    });
  };

  const writeRsvp = async (
    response: 'yes' | 'tentative' | 'no',
    recurrenceIds?: string[]
  ) => {
    setIsRegistering(true);
    setScopeError(null);
    try {
      const result = recurrenceIds?.length
        ? recurrenceIds.length === 1
          ? await rsvpToEvent({
              response,
              recurrenceId: recurrenceIds[0],
            })
          : await rsvpToEvent({ response, recurrenceIds })
        : await rsvpToEvent({ response });
      if (!result) {
        throw new Error(t('posts.rsvp.error'));
      }
      Toast.show({
        type: 'success',
        text1: t('posts.rsvp.success'),
      });
    } catch (error) {
      showRsvpError(error);
      throw error;
    } finally {
      setIsRegistering(false);
    }
  };

  const requestRespond = (response: 'yes' | 'tentative' | 'no') => {
    if (!recurring) {
      return writeRsvp(
        response,
        recurrenceId ? [recurrenceId] : undefined
      ).catch(() => undefined);
    }
    setPending(response);
    setScopeError(null);
    bottomSheetPresent(scopeSheetRef);
  };

  const confirmScope = async (scope: {
    kind: 'this' | 'selected' | 'series';
    recurrenceId?: string;
    recurrenceIds?: string[];
  }) => {
    if (!pending) return;
    try {
      if (scope.kind === 'series') {
        await writeRsvp(pending);
      } else if (scope.kind === 'this' && scope.recurrenceId) {
        await writeRsvp(pending, [scope.recurrenceId]);
      } else if (scope.kind === 'selected' && scope.recurrenceIds) {
        await writeRsvp(pending, scope.recurrenceIds);
      }
      setPending(null);
      scopeSheetRef.current?.close();
    } catch {
      // error already set
    }
  };

  if (myEvent) {
    return null;
  }

  if (myRsvp?.response === 'removed') {
    return (
      <View className="mt-5 w-full">
        <ThemedText className="text-center text-muted-foreground">
          {t('events.rsvp.removedMessage')}
        </ThemedText>
      </View>
    );
  }

  return (
    <View className="mt-5 w-full">
      {myRsvp && myRsvp.response !== 'no' ? (
        <Button
          onPress={() => requestRespond('no')}
          disabled={isRegistering}
          variant={'outline'}
        >
          <ThemedText className="text-destructive">
            {isRegistering
              ? t('common.form.loading')
              : t('posts.rsvp.cancelRegistration')}
          </ThemedText>
        </Button>
      ) : (
        <View className="flex-row items-center w-full gap-x-4">
          <Button
            onPress={() => requestRespond('yes')}
            className="w-[60%]"
            disabled={full || isRegistering}
          >
            <ThemedText>
              {isRegistering
                ? t('common.form.loading')
                : full
                  ? t('events.rsvp.full')
                  : t('posts.rsvp.register')}
            </ThemedText>
          </Button>
          {!capacityEvent ? (
            <Button
              onPress={() => requestRespond('tentative')}
              variant={'ghost'}
              className="bg-muted-foreground/20"
            >
              <ThemedText className="text-muted-foreground">
                {isRegistering
                  ? t('common.form.loading')
                  : t('posts.rsvp.maybe')}
              </ThemedText>
            </Button>
          ) : null}
          <Button onPress={() => requestRespond('no')} variant={'outline'}>
            <ThemedText className="text-destructive">
              {isRegistering ? t('common.form.loading') : t('posts.rsvp.no')}
            </ThemedText>
          </Button>
        </View>
      )}
      <EventRsvpScopeSheet
        ref={scopeSheetRef}
        post={post}
        response={pending ?? 'yes'}
        defaultRecurrenceId={defaultId}
        occurrences={occurrences}
        error={scopeError}
        isLoading={isRegistering}
        onConfirm={confirmScope}
      />
    </View>
  );
};

export const FullEventActions: React.FC<{
  post: PublicPost;
  occurrence?: string;
}> = ({ post, occurrence }) => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const cancelEventRef = useRef<BottomSheetModal>(null);
  const deleteEventRef = useRef<BottomSheetModal>(null);
  const reportPostModalRef = useRef<BottomSheetModal>(null);
  const event = post?.data as Event;
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const updatePost = openpeepsApi.updatePostAction({ id: post?.id });
  const deletePost = openpeepsApi.deletePostAction({
    id: post?.id,
  });
  const thisOccurrence = !!event?.recurrence && !!occurrence;

  const handleDeleteThis = async () => {
    if (!occurrence) return;
    await updatePost(
      upsertEventException(event, {
        recurrenceId: occurrence,
        cancelled: true,
      })
    );
    navigation.goBack();
  };

  const handleDelete = async () => {
    deletePost().then((res) => {
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
                {thisOccurrence ? (
                  <DropdownMenuItem
                    className="flex-row gap-x-2 items-center"
                    onPress={() => {
                      navigation.navigate('EditEvent', {
                        id: post?.id,
                        occurrence,
                      });
                    }}
                  >
                    <PencilLineIcon className="text-foreground" size={18} />
                    <ThemedText>{t('events.menu.editThis')}</ThemedText>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={() => {
                    navigation.navigate('EditEvent', {
                      id: post?.id,
                    });
                  }}
                >
                  <PencilLineIcon className="text-foreground" size={18} />
                  <ThemedText>
                    {thisOccurrence
                      ? t('events.menu.editAll')
                      : t('common.actions.edit')}
                  </ThemedText>
                </DropdownMenuItem>
                {thisOccurrence ? (
                  <DropdownMenuItem
                    className="flex-row gap-x-2 items-center"
                    onPress={() => void handleDeleteThis()}
                  >
                    <Trash2Icon className="text-destructive" size={18} />
                    <ThemedText className="text-destructive">
                      {t('events.menu.deleteThis')}
                    </ThemedText>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={handleDeleteModalPress}
                >
                  <Trash2Icon className="text-destructive" size={18} />
                  <ThemedText className="text-destructive">
                    {thisOccurrence
                      ? t('events.menu.deleteAll')
                      : t('common.actions.delete')}
                  </ThemedText>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : (
            <DropdownMenuGroup>
              {event?.moderators?.includes(currentProfile?.id as string) && (
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={() => {}}
                >
                  <PencilLineIcon className="text-foreground" size={18} />
                  <ThemedText>Edit</ThemedText>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="flex-row gap-x-2 items-center"
                onPress={handleReportPostModalPress}
              >
                <FlagIcon className="text-destructive" size={18} />
                <ThemedText className="text-destructive">Report</ThemedText>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CancelEventSheet ref={cancelEventRef} onCancel={async () => {}} />
      <DeleteEventSheet ref={deleteEventRef} onDelete={handleDelete} />
      <ReportProfileOrPostSheet
        ref={reportPostModalRef}
        post={post}
        reportType="post"
      />
    </>
  );
};
