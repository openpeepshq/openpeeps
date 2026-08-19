import type { FetchClient } from '@openpeepshq/fetch-client';
import type {
  ChronologicalInfiniteQueryParams,
  JamEvent,
  JamState,
  JamTokenResponse,
  PublicPost,
  MuteParticipantRequest,
  PublicProfile,
  SuccessResponse,
  JamRecording,
  JamObserverResponseData,
  JamRtmpStreamRequest,
  JamRtmpStreamResponse,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';
import { noPayloadEventSource } from '@openpeepshq/fetch-client';

export const jams = (
  rawClient: FetchClient,
  eventSource: ReturnType<typeof noPayloadEventSource>,
) => {
  return {
    list: allpeepNoPayloadEndpoint<PublicPost[], undefined, { live?: 'true' }>(
      rawClient,
      '/jams',
    ),
    state: allpeepNoPayloadEndpoint<JamState, { id: string }>(
      rawClient,
      '/jams/:id/state',
    ),
    close: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
      rawClient,
      '/jams/:id/close',
      'put',
    ),
    token: allpeepNoPayloadEndpoint<JamTokenResponse, { id: string }>(
      rawClient,
      '/jams/:id/token',
    ),
    muteParticipant: allpeepPayloadEndpoint<
      SuccessResponse,
      MuteParticipantRequest,
      { id: string }
    >(rawClient, '/jams/:id/mute-participant'),
    waitingRoom: {
      listen: eventSource<Record<string, PublicProfile>, { id: string }>(
        '/jams/:id/waiting-room',
      ),
      join: eventSource<JamTokenResponse, { id: string }>(
        '/jams/:id/waiting-room',
        'post',
      ),
      admit: allpeepNoPayloadEndpoint<
        SuccessResponse,
        { id: string; profileId: string }
      >(rawClient, '/jams/:id/waiting-room/:profileId/admit', 'post'),
    },
    events: {
      list: allpeepNoPayloadEndpoint<
        JamEvent[],
        { id: string },
        ChronologicalInfiniteQueryParams
      >(rawClient, '/jams/:id/events'),
      create: allpeepPayloadEndpoint<JamEvent, JamEvent, { id: string }>(
        rawClient,
        '/jams/:id/events',
      ),
      attendance: allpeepNoPayloadEndpoint<JamEvent[], { id: string }>(
        rawClient,
        '/jams/:id/events/attendance',
      ),
    },
    recordings: {
      start: allpeepNoPayloadEndpoint<JamRecording, { id: string }>(
        rawClient,
        '/jams/:id/recordings',
        'post',
      ),
      stop: allpeepNoPayloadEndpoint<JamRecording, { id: string }>(
        rawClient,
        '/jams/:id/recordings/stop',
        'put',
      ),
      observerLink: allpeepNoPayloadEndpoint<
        JamObserverResponseData,
        { id: string }
      >(rawClient, '/jams/:id/recordings/observer-link', 'get'),
    },
    streams: {
      get: allpeepNoPayloadEndpoint<JamRtmpStreamResponse, { id: string }>(
        rawClient,
        '/jams/:id/streams',
      ),
      start: allpeepPayloadEndpoint<
        JamRtmpStreamResponse,
        JamRtmpStreamRequest,
        { id: string }
      >(rawClient, '/jams/:id/streams', 'post'),
      stop: allpeepNoPayloadEndpoint<JamRtmpStreamResponse, { id: string }>(
        rawClient,
        '/jams/:id/streams/stop',
        'put',
      ),
    },
  };
};
