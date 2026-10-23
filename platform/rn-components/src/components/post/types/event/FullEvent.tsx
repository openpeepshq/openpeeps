import React, { useMemo, useRef, useState } from 'react';
import { useOpenpeeps, useServerInfo } from '@openpeepshq/react';
import {
  MoreVerticalIcon,
  ShareIcon,
  DownloadIcon,
  Trash2Icon,
  MapPinIcon,
  LinkIcon,
  PhoneCallIcon,
  Link2Icon,
  SendIcon,
  PencilIcon,
  FlagIcon,
} from '../../../icons/index';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../ui/dropdown-menu';
import { ThemedText } from '../../../ui/themed-text';
import { Image, Pressable, Share, TouchableOpacity, View } from 'react-native';
import RNFS from 'react-native-fs';
import {
  Event,
  PublicPost,
  Profile,
  Group,
  GroupData,
  buildThreads,
  type JamRecording,
} from '@openpeepshq/common';
import { ProfileAvatar } from '../../../profile/Avatar';
import { ProfileFromId } from '../../../profile/ProfileFromId';
import { Button } from '../../../ui/button';
import { UpdatingDate } from '../../../custom/date/updating-date';
import { VideoPlayer } from '../../pieces/VideoPlayer';
import { profileName, truncateText } from '../../../../lib/utils';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../../navigation/types/index';
import { groupName } from '../../../../lib/utils';
import { BASE_URL } from '../../../../lib/constants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { useNewConversationStore } from '../../../../stores/useNewConversationStore';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { canManageEventRsvps } from '../../../../lib/utils';
import { bottomSheetPresent } from '../../../../lib/bottom-sheet-ref';
import {
  availableSpots,
  canAccessJamRecordings,
  canModerateJam,
  canViewJamAttendees,
  effectiveEventTimes,
  eventTimeZoneOptions,
  formatEventClockTime,
  formatEventRecurrence,
  listRsvpOccurrences,
  parseOccurrenceQuery,
  rsvpExportFilename,
} from '@openpeepshq/common/lib';
import { ThemedView } from '../../../ui/themed-view';
import { EventOccurrenceList } from '../../pieces/EventOccurrenceList';
import { EventRsvpList } from '../../pieces/EventRsvpList';

import {
  EventMenu,
  EventRsvpButton,
  ReplyBox,
  ShareMenu,
  ThreadedFeed,
  useNewPostModal,
} from '../../index';
import { ReportProfileOrPostModal } from '../../../profile/index';
import { OpenpeepsMarkdown } from '../../../markdown/index';
import { downloadDocument } from '../../../../lib/downloadFile';
import { useControlledSheet } from '../../../../hooks/use-controlled-sheet';
import { BaseSheet, SheetFooter } from '../../../custom/modals/common';
export interface FullEventProps {
  post: PublicPost;
  occurrence?: string;
}

export const FullEvent: React.FC<FullEventProps> = ({ post, occurrence }) => {
  const { t } = useTranslation();
  const { currentProfile, openpeepsApi, client } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { openNewPost } = useNewPostModal();
  const [tabValue, setTabValue] = React.useState(
    (post?.data as Event)?.content ? 'description' : 'discussions'
  );
  const { setContt } = useNewConversationStore();

  const group = useMemo(() => post?.group as Group, [post]);
  const event = useMemo(() => post?.data as Event, [post]);

  const canManageRsvps = canManageEventRsvps(currentProfile, post);
  const slotsLeft = availableSpots(post, occurrence) ?? null;
  const rsvpManage = openpeepsApi.rsvpManageAction();
  const exportRsvps = async () => {
    try {
      const csv = await client.posts.exportRsvps({
        id: post.id,
        occurrence: parseOccurrenceQuery(occurrence),
      });
      const filename = rsvpExportFilename(event?.name, new Date());
      const path = `${RNFS.CachesDirectoryPath}/${filename}`;
      await RNFS.writeFile(path, csv, 'utf8');
      await Share.share({
        url: `file://${path}`,
        title: filename,
      }).catch(() => undefined);
    } catch {
      Toast.show({
        type: 'error',
        text1: t('events.exportRsvpsError', {
          defaultValue: 'Failed to export RSVPs',
        }),
      });
    }
  };
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

  const serverInfo = useServerInfo();
  const livekitEnabled = serverInfo.jams.livekit.enabled;
  const myEvent = currentProfile?.id === post?.profile?.id;
  const iAmModerator = canModerateJam(currentProfile, post);
  const canExportAttendees = canViewJamAttendees(currentProfile, post);
  const canViewRecordings = canAccessJamRecordings(currentProfile, post);
  const jamAttendeesQuery = openpeepsApi.useJamAttendance(post.id);
  const jamStateQuery = openpeepsApi.useJamState(post.id, occurrence);
  const jamState = event.jam ? jamStateQuery.data : undefined;
  const recordingsQuery = openpeepsApi.usePostRecordings(
    post.id,
    !!event.jam && canViewRecordings
  );
  const showJamAttendeesTab =
    !!event.jam && canExportAttendees && jamAttendeesQuery.isSuccess;

  const postContextQuery = openpeepsApi.usePostContext(post.id);

  const descendentThreads = useMemo(
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
              : require('../../../../assets/images/event-placeholder.png')
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
      {event.jam && (myEvent || iAmModerator) ? (
        livekitEnabled ? (
          jamState?.active ? (
            <Button
              className="mt-2 w-full"
              onPress={() =>
                navigation.navigate('JamSession', {
                  jamId: post.id,
                  occurrence: occurrence,
                })
              }
            >
              <ThemedText numberOfLines={1}>
                {t('jam.join.submit', { defaultValue: 'Join Jam' })}
              </ThemedText>
            </Button>
          ) : (
            <Button
              className="mt-2 w-full"
              onPress={() =>
                navigation.navigate('JamSession', {
                  jamId: post.id,
                  occurrence: occurrence,
                })
              }
            >
              <ThemedText numberOfLines={1}>
                {t('events.jam.start', { defaultValue: 'Start jam' })}
              </ThemedText>
            </Button>
          )
        ) : (
          <ThemedText className="mt-2 text-sm text-destructive">
            {t('jams.unavailable.message', {
              defaultValue:
                'Jams are unavailable because LiveKit is not connected.',
            })}
          </ThemedText>
        )
      ) : null}
      <Tabs
        onValueChange={setTabValue}
        value={tabValue}
        className="mx-auto mt-5 w-full flex-col gap-1.5"
      >
        <TabsList className="w-full flex-row flex-wrap rounded-none border-b border-muted bg-transparent p-0 px-1">
          {event?.content ? (
            <TabsTrigger
              value="description"
              onPress={() => setTabValue('description')}
              className={
                tabValue === 'description' ? 'border-b-2 border-foreground' : ''
              }
            >
              <ThemedText>
                {t('events.tabs.description', { defaultValue: 'Description' })}
              </ThemedText>
            </TabsTrigger>
          ) : null}
          <TabsTrigger
            value="discussions"
            className={
              tabValue === 'discussions' ? 'border-b-2 border-foreground' : ''
            }
            onPress={() => setTabValue('discussions')}
          >
            <ThemedText>
              {t('events.tabs.discussion', { defaultValue: 'Discussion' })}
            </ThemedText>
          </TabsTrigger>
          <TabsTrigger
            value="rsvps"
            className={
              tabValue === 'rsvps' ? 'border-b-2 border-foreground' : ''
            }
            onPress={() => setTabValue('rsvps')}
          >
            <ThemedText>
              {t('events.tabs.rsvps', { defaultValue: 'RSVPs' })}
            </ThemedText>
          </TabsTrigger>
          {showJamAttendeesTab ? (
            <TabsTrigger
              value="attendees"
              className={
                tabValue === 'attendees' ? 'border-b-2 border-foreground' : ''
              }
              onPress={() => setTabValue('attendees')}
            >
              <ThemedText>
                {t('events.tabs.jamAttendees', {
                  defaultValue: 'Jam attendees',
                })}
              </ThemedText>
            </TabsTrigger>
          ) : null}
          {event.jam ? (
            <TabsTrigger
              value="recordings"
              className={
                tabValue === 'recordings' ? 'border-b-2 border-foreground' : ''
              }
              onPress={() => setTabValue('recordings')}
            >
              <ThemedText>
                {t('events.tabs.recordings', { defaultValue: 'Recordings' })}
              </ThemedText>
            </TabsTrigger>
          ) : null}
        </TabsList>
        {event?.content ? (
          <TabsContent value="description" className="p-0">
            <OpenpeepsMarkdown source={event.content} linkPreviewMode="none" />
          </TabsContent>
        ) : null}
        <TabsContent value="discussions" className="flex-1 p-0">
          <ReplyBox post={post} />
          {descendentThreads.map((thread) => (
            <ThreadedFeed key={thread.id} thread={thread} />
          ))}
        </TabsContent>
        <TabsContent value="rsvps" className="px-0 py-4">
          {canManageRsvps ? (
            <Button
              variant="outline"
              className="mb-3 self-end"
              onPress={() => {
                void exportRsvps();
              }}
            >
              <ThemedText>
                {t('events.exportRsvps', { defaultValue: 'Export RSVPs' })}
              </ThemedText>
            </Button>
          ) : null}
          <EventRsvpList
            post={post as PublicPost}
            occurrenceId={occurrence}
            occurrences={upcomingOccurrences}
            canManageRsvps={canManageRsvps}
            onManage={(response, profileId, recurrenceId) =>
              rsvpManage({ response, recurrenceId }, { id: post.id, profileId })
            }
          />
        </TabsContent>
        {showJamAttendeesTab ? (
          <TabsContent value="attendees" className="px-0 py-4">
            {jamAttendeesQuery.data?.length ? (
              jamAttendeesQuery.data.map((attendee) => (
                <View
                  key={attendee.id}
                  className="flex-row items-center justify-between py-2"
                >
                  <ProfileFromId id={attendee.profileId} />
                  <UpdatingDate date={attendee.createdAt} />
                </View>
              ))
            ) : (
              <ThemedText className="py-4 text-sm text-muted-foreground">
                {t('events.noAttendees', { defaultValue: 'No attendees yet.' })}
              </ThemedText>
            )}
          </TabsContent>
        ) : null}
        {event.jam ? (
          <TabsContent value="recordings" className="px-0 py-4">
            {!canViewRecordings ? (
              <ThemedText className="py-4 text-center text-sm text-muted-foreground">
                {t('error.jamRecordingForbidden', {
                  defaultValue:
                    "You don't have permission to view recordings for this jam.",
                })}
              </ThemedText>
            ) : recordingsQuery.isLoading ? (
              <ThemedText className="py-4 text-sm text-muted-foreground">
                {t('common.loading', { defaultValue: 'Loading…' })}
              </ThemedText>
            ) : recordingsQuery.data?.length ? (
              recordingsQuery.data.map((recording: JamRecording) => (
                <JamRecordingItem
                  key={recording.id}
                  post={post}
                  recording={recording}
                  canManage={canViewRecordings}
                />
              ))
            ) : (
              <ThemedText className="py-4 text-sm text-muted-foreground">
                {t('events.noRecordings', {
                  defaultValue: 'No recordings yet.',
                })}
              </ThemedText>
            )}
          </TabsContent>
        ) : null}
      </Tabs>
    </ThemedView>
  );
};

const JamRecordingItem = ({
  post,
  recording,
  canManage,
}: {
  post: PublicPost;
  recording: JamRecording;
  canManage: boolean;
}) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmSheetRef = useControlledSheet(confirmOpen);

  const attachment = recording.attachment;
  const publishReply = openpeepsApi.publishRecordingReplyAction({
    id: post.id,
    recordingId: recording.id,
  });
  const deleteRecording = openpeepsApi.deleteRecordingAction({
    id: post.id,
    recordingId: recording.id,
  });

  const handleDelete = async () => {
    try {
      await deleteRecording();
      setConfirmOpen(false);
      Toast.show({
        type: 'success',
        text1: t('events.deleteRecordingSuccess', {
          defaultValue: 'Recording deleted',
        }),
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: t('events.deleteRecordingError', {
          defaultValue: 'Failed to delete recording',
        }),
      });
    }
  };

  return (
    <View className="flex-col gap-2 py-4">
      <UpdatingDate date={recording.createdAt} />
      {recording.status === 'completed' && attachment ? (
        <>
          <VideoPlayer
            attachment={attachment}
            autoPlay={false}
            className="aspect-video w-full rounded-md"
          />
          <TouchableOpacity
            onPress={() => downloadDocument(attachment.url)}
            className="self-start"
          >
            <View className="flex-row items-center gap-1">
              <DownloadIcon size={16} className="text-foreground" />
              <ThemedText className="text-sm text-primary underline">
                {t('events.downloadRecording', {
                  defaultValue: 'Download recording',
                })}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </>
      ) : (
        <ThemedText className="text-sm text-muted-foreground">
          {recording.status === 'active'
            ? t('events.recordingInProgress', {
                defaultValue: 'Recording in progress…',
              })
            : t('events.recordingProcessing', {
                defaultValue: 'Processing recording…',
              })}
        </ThemedText>
      )}
      <View className="flex-row flex-wrap items-center gap-2">
        {canManage && recording.status === 'completed' && attachment ? (
          recording.replyPostId ? (
            <ThemedText className="text-sm text-muted-foreground">
              {t('events.recordingReplyPosted', {
                defaultValue: 'Posted to discussion',
              })}
            </ThemedText>
          ) : (
            <Button
              variant="outline"
              className="self-start"
              onPress={async () => {
                try {
                  await publishReply();
                  Toast.show({
                    type: 'success',
                    text1: t('events.postRecordingReplySuccess', {
                      defaultValue: 'Recording posted to discussion',
                    }),
                  });
                } catch {
                  Toast.show({
                    type: 'error',
                    text1: t('events.postRecordingReplyError', {
                      defaultValue: 'Failed to post recording to discussion',
                    }),
                  });
                }
              }}
            >
              <ThemedText className="font-semibold">
                {t('events.postRecordingReply', {
                  defaultValue: 'Post to discussion',
                })}
              </ThemedText>
            </Button>
          )
        ) : null}
        {canManage &&
        recording.status !== 'active' &&
        recording.status !== 'requested' ? (
          <>
            <Button
              variant="outline"
              className="self-start"
              onPress={() => setConfirmOpen(true)}
            >
              <View className="flex-row items-center gap-1">
                <Trash2Icon size={16} className="text-foreground" />
                <ThemedText className="font-semibold">
                  {t('events.deleteRecording', {
                    defaultValue: 'Delete recording',
                  })}
                </ThemedText>
              </View>
            </Button>
            <BaseSheet
              ref={confirmSheetRef}
              onDismiss={() => setConfirmOpen(false)}
            >
              <View className="flex-1 p-4">
                <ThemedText className="mb-6 text-center text-xl font-semibold">
                  {t('events.deleteRecording', {
                    defaultValue: 'Delete recording',
                  })}
                </ThemedText>
                <ThemedText className="mb-6 text-center text-base text-muted-foreground">
                  {t('events.deleteRecordingConfirm', {
                    defaultValue: 'Delete this recording permanently?',
                  })}
                </ThemedText>
                <SheetFooter
                  onCancel={() => setConfirmOpen(false)}
                  cancelText={t('common.cancel')}
                  onConfirm={() => void handleDelete()}
                  confirmText={t('events.deleteRecording', {
                    defaultValue: 'Delete recording',
                  })}
                  confirmVariant="destructive"
                />
              </View>
            </BaseSheet>
          </>
        ) : null}
      </View>
    </View>
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
      <ShareMenu
        post={post}
        menuButton={
          <Pressable
            accessibilityLabel={t('posts.footer.share')}
            className="flex-row items-center gap-1 px-2"
          >
            <ShareIcon size={18} className="text-foreground" />
            <ThemedText className="text-sm">
              {t('posts.footer.share')}
            </ThemedText>
          </Pressable>
        }
      />
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
