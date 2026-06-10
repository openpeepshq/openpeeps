import type { OpenpeepsClient } from '@openpeeps/client';
import {
  apiHook,
  infiniteChronologicalQueryApiHook,
  payloadMutation,
  noPayloadMutation,
  noPayloadStream,
} from '../helpers';

export type JamHooks = ReturnType<typeof jamHooks>;

export const jamHooks = (client: OpenpeepsClient) => ({
  useJams: () => apiHook(client.jams.list, { queryParams: { live: 'true' } }),
  closeJamAction: noPayloadMutation(client.jams.close, [['jams']]),
  useJamToken: (id: string) =>
    apiHook(client.jams.token, { pathParams: { id } }),
  useJamState: (id: string) =>
    apiHook(client.jams.state, { pathParams: { id }, refetchInterval: 1500 }),
  muteJamParticipantAction: payloadMutation(client.jams.muteParticipant),
  useJamEvents: (id: string) =>
    apiHook(client.jams.events.list, { pathParams: { id } }),
  useInfiniteJamEvents: (id: string, limit = 100) =>
    infiniteChronologicalQueryApiHook(client.jams.events.list, {
      pathParams: { id },
      queryParams: { limit },
    }),
  createJamEventAction: payloadMutation(client.jams.events.create, [['jams']]),
  useJamAttendance: (id: string) =>
    apiHook(client.jams.events.attendance, { pathParams: { id } }),
  useWaitingRoomStream: (id: string) =>
    noPayloadStream(client.jams.waitingRoom.listen).last({
      pathParameters: { id },
    }),
  admitParticipantAction: noPayloadMutation(client.jams.waitingRoom.admit),
  useJoinWaitingRoomStream: (id: string) =>
    noPayloadStream(client.jams.waitingRoom.join).last({
      pathParameters: { id },
    }),
  startRecordingAction: noPayloadMutation(client.jams.recordings.start),
  stopRecordingAction: noPayloadMutation(client.jams.recordings.stop, [['jams']]),
  useObserverLink: (id: string) =>
    apiHook(client.jams.recordings.observerLink, { pathParams: { id } }),
});
