import React, { useMemo, useRef } from 'react';
import { useOpenpeeps } from '@openpeepshq/react';
import { EmptyStateContainer } from '~/components/custom';
import {
  MoreVerticalIcon,
  ShareIcon,
  MapPinIcon,
  LinkIcon,
  PhoneCallIcon,
  Link2Icon,
  SendIcon,
  PencilIcon,
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
import { ProfileAvatar } from '~/components/profile/Avatar';
import { profileName, truncateText } from '~/lib/utils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { groupName } from '~/lib/utils';
import { BASE_URL } from '~/lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { useNewConversationStore } from '~/stores/useNewConversationStore';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import {
  canManageEventRsvps,
  countYesRsvps,
  isCapacityEvent,
} from '~/lib/utils';
import { bottomSheetPresent } from '~/lib/bottom-sheet-ref';
import {
  effectiveEventTimes,
  eventTimeZoneOptions,
  formatEventClockTime,
  formatEventRecurrence,
  listRsvpOccurrences,
} from '@openpeepshq/common/lib';
import { ThemedView } from '~/components/ui/themed-view';
import { EventOccurrenceList } from '../../pieces/EventOccurrenceList';
import { EventRsvpList } from '../../pieces/EventRsvpList';

import {
  EventMenu,
  EventRsvpButton,
  ReplyBox,
  ShareMenu,
  ThreadedFeed,
  useNewPostModal,
} from '~/components/post';
import { ReportProfileOrPostModal } from '~/components/profile';
import { OpenpeepsMarkdown } from '~/components/markdown';
interface FullEventProps {
  post: PublicPost;
  occurrence?: string;
}

export const FullEvent: React.FC<FullEventProps> = ({ post, occurrence }) => {
  const { t } = useTranslation();
  const { currentProfile, openpeepsApi } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { openNewPost } = useNewPostModal();
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

  const onRepostToFeed = () =>
    openNewPost({
      initialContent: `Join our event happening at ${BASE_URL}/post/${post?.id}`,
    });
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
  }, [post?.groupId, post?.visibility, t]);

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
      <EventRsvpButton post={post as PublicPost} recurrenceId={occurrence} />
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
            <OpenpeepsMarkdown source={event?.content} linkPreviewMode="none" />
          ) : (
            <EmptyStateContainer type="event-description" />
          )}
        </TabsContent>
        <TabsContent value="discussions" className="flex-1 p-0">
          <ReplyBox post={post} />
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

export const FullEventActions: React.FC<{
  post: PublicPost;
  occurrence?: string;
}> = ({ post, occurrence }) => {
  const { currentProfile } = useOpenpeeps();
  const reportPostModalRef = useRef<BottomSheetModal>(null);
  const { t } = useTranslation();
  const myEvent = currentProfile?.id === post?.profile?.id;

  return (
    <View className="flex-row items-center">
      <ShareMenu post={post} />
      {myEvent ? (
        <EventMenu post={post} occurrence={occurrence} />
      ) : (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="px-2">
              <MoreVerticalIcon className="text-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mt-1">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="flex-row gap-x-2 items-center"
                  onPress={() => bottomSheetPresent(reportPostModalRef)}
                >
                  <FlagIcon className="text-destructive" size={18} />
                  <ThemedText className="text-destructive">
                    {t('common.actions.reportPost')}
                  </ThemedText>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <ReportProfileOrPostModal
            ref={reportPostModalRef}
            post={post}
            reportType="post"
          />
        </>
      )}
    </View>
  );
};
