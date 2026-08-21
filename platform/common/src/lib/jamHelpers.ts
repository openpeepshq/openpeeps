import { Jam, JamRecording, PublicPost, PublicProfile } from '../types';
import { normalizeRecurrenceId } from './eventRecurrence';

export const jamRoomName = (postId: string, recurrenceId?: string) => {
  if (!recurrenceId) return postId;
  return `${postId}_${normalizeRecurrenceId(recurrenceId).replace(/[^a-zA-Z0-9-]/g, '-')}`;
};

const UUID_PREFIX =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:_.*)?$/i;

export const postIdFromJamRoomName = (roomName: string): string => {
  const match = roomName.match(UUID_PREFIX);
  return match?.[1] ?? roomName;
};

export const getJamUrl = (
  id: string,
  origin: string | undefined,
  occurrence?: string,
) => {
  if (!id) {
    return '';
  }
  const query = occurrence
    ? `?occurrence=${encodeURIComponent(normalizeRecurrenceId(occurrence))}`
    : '';
  if (!origin) return `/events/${id}/jam${query}`;
  return `${origin}/events/${id}/jam${query}`;
};

export const jamFromEvent = (event: PublicPost): Jam | undefined => {
  if (event.data?.type === 'event' && event.data?.jam) {
    return event.data.jam;
  }
  return undefined;
};

export const canModerateJam = (
  profile: Pick<PublicProfile, 'id'> | undefined,
  post: PublicPost,
) => !!(profile && jamFromEvent(post)?.moderators?.includes(profile.id));

export const canAccessJamRecordings = (
  profile: PublicProfile | undefined,
  post: PublicPost,
) => {
  if (!profile) {
    return false;
  }
  if (post.profile.id === profile.id) {
    return true;
  }
  if (post.data?.type !== 'event') {
    return false;
  }
  const event = post.data;
  if (event.moderators?.includes(profile.id)) {
    return true;
  }
  return !!event.jam?.moderators?.includes(profile.id);
};

export const isRtmpJamRecording = (recording: { kind?: string | null }) =>
  recording.kind === 'rtmp';

export const isFileJamRecording = (recording: { kind?: string | null }) =>
  !isRtmpJamRecording(recording);

export const pickActiveFileRecording = <T extends { kind?: string | null }>(
  recordings: T[],
) => recordings.find(isFileJamRecording);

export const pickActiveRtmpStream = <T extends { kind?: string | null }>(
  recordings: T[],
) => recordings.find(isRtmpJamRecording);

export const assembleRtmpUrl = (
  url: string,
  streamKey: string,
): string | undefined => {
  const base = url.trim().replace(/\/+$/, '');
  const key = streamKey.trim().replace(/^\/+/, '');
  if (!base || !key) {
    return undefined;
  }
  if (!/^rtmps?:\/\//i.test(base)) {
    return undefined;
  }
  return `${base}/${key}`;
};

export const rtmpDestinationHost = (rtmpUrl: string): string | undefined => {
  try {
    return new URL(rtmpUrl).hostname || undefined;
  } catch {
    return undefined;
  }
};

export const toRtmpStreamResponse = (recording: JamRecording) => ({
  id: recording.id,
  status: recording.status,
  destinationHost: recording.destinationHost,
  egressId: recording.egressId,
});
