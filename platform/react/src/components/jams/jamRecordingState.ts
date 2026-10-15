import { useEffect, useMemo, useState } from 'react';
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
      120;
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

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Elapsed milliseconds as m:ss, or h:mm:ss past one hour (recording pill). */
export const formatRecordingElapsed = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${pad2(minutes)}:${pad2(seconds)}`;
};

/**
 * Elapsed time of the active recording, ticked once per second. Returns
 * `undefined` while nothing is recording (no timer while idle).
 */
export const useJamRecordingElapsed = () => {
  const { isRecording, recordingStart } = useJamRecordingState();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRecording) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRecording, recordingStart]);

  return useMemo(() => {
    if (!isRecording || !recordingStart) return undefined;
    return formatRecordingElapsed(now - new Date(recordingStart).getTime());
  }, [isRecording, recordingStart, now]);
};
