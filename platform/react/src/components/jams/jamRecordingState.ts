import { useMemo } from 'react';
import type { JamEvent } from '@openpeepshq/common/types';
import { getUniqueBy } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useJamContext } from './JamContext';
import { useJamEventsContext } from './JamEventsContext';

/** Mirrors Svelte `calculateRecordingState` in jams/helpers.ts. */
export const calculateRecordingState = (
  persistedEvents: JamEvent[],
  sessionEvents: JamEvent[],
) => {
  const events = getUniqueBy(
    [...persistedEvents, ...sessionEvents],
    (event) => event.id,
  ).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const lastRecordingStart = events.find(
    (event) => event.type === 'recordStart',
  );
  const lastRecordingStop = events.find((event) => event.type === 'recordStop');
  const isRecording =
    !!lastRecordingStart &&
    (!lastRecordingStop ||
      lastRecordingStart.createdAt > lastRecordingStop.createdAt) &&
    (Date.now() - new Date(lastRecordingStart.createdAt).getTime()) / 60_000 <
      60;
  const recordingStart = isRecording ? lastRecordingStart.createdAt : undefined;
  return { isRecording, recordingStart };
};

export const calculateRtmpStreamState = (
  persistedEvents: JamEvent[],
  sessionEvents: JamEvent[],
) => {
  const events = getUniqueBy(
    [...persistedEvents, ...sessionEvents],
    (event) => event.id,
  ).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const lastStart = events.find((event) => event.type === 'streamStart');
  const lastStop = events.find((event) => event.type === 'streamStop');
  const isStreaming =
    !!lastStart && (!lastStop || lastStart.createdAt > lastStop.createdAt);
  return { isStreaming };
};

export const useJamRecordingState = () => {
  const { jamPost } = useJamContext();
  const { sessionEvents } = useJamEventsContext();
  const { openpeepsApi } = useOpenpeeps();
  const eventsQuery = openpeepsApi.useJamEvents(jamPost.id);

  return useMemo(
    () => calculateRecordingState(eventsQuery.data ?? [], sessionEvents),
    [eventsQuery.data, sessionEvents],
  );
};

export const useJamRtmpStreamState = () => {
  const { jamPost } = useJamContext();
  const { sessionEvents } = useJamEventsContext();
  const { openpeepsApi } = useOpenpeeps();
  const eventsQuery = openpeepsApi.useJamEvents(jamPost.id);

  return useMemo(
    () => calculateRtmpStreamState(eventsQuery.data ?? [], sessionEvents),
    [eventsQuery.data, sessionEvents],
  );
};
