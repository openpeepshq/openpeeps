import { describe, expect, it } from 'vitest';
import type { JamEvent } from '@openpeepshq/common/types';
import {
  calculateRecordingState,
  formatRecordingElapsed,
} from './jamRecordingState';

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

const recordingEvent = (
  id: string,
  type: 'recordStart' | 'recordStop',
  createdAt: string,
): JamEvent =>
  ({
    id,
    jamId: 'jam-1',
    type,
    profileId: 'profile-1',
    createdAt,
    updatedAt: createdAt,
  }) as JamEvent;

describe('calculateRecordingState', () => {
  it('is idle without events', () => {
    expect(calculateRecordingState([], [])).toEqual({
      isRecording: false,
      recordingStart: undefined,
    });
  });

  it('is active while the start has no later stop', () => {
    const start = recordingEvent('e1', 'recordStart', minutesAgo(5));
    expect(calculateRecordingState([], [start])).toEqual({
      isRecording: true,
      recordingStart: start.createdAt,
    });
  });

  it('is idle after a confirmed stop', () => {
    const start = recordingEvent('e1', 'recordStart', minutesAgo(10));
    const stop = recordingEvent('e2', 'recordStop', minutesAgo(4));
    expect(calculateRecordingState([], [start, stop])).toEqual({
      isRecording: false,
      recordingStart: undefined,
    });
  });

  it('is active after a restart following a stop', () => {
    const firstStart = recordingEvent('e1', 'recordStart', minutesAgo(30));
    const stop = recordingEvent('e2', 'recordStop', minutesAgo(20));
    const secondStart = recordingEvent('e3', 'recordStart', minutesAgo(2));
    expect(
      calculateRecordingState([], [firstStart, stop, secondStart]),
    ).toEqual({
      isRecording: true,
      recordingStart: secondStart.createdAt,
    });
  });

  it('deduplicates events present in both persisted and session lists', () => {
    const start = recordingEvent('e1', 'recordStart', minutesAgo(1));
    expect(calculateRecordingState([start], [start])).toEqual({
      isRecording: true,
      recordingStart: start.createdAt,
    });
  });

  it('falls back to idle for a stale start beyond the 120 minute window', () => {
    const staleStart = recordingEvent('e1', 'recordStart', minutesAgo(121));
    expect(calculateRecordingState([], [staleStart])).toEqual({
      isRecording: false,
      recordingStart: undefined,
    });
  });
});

describe('formatRecordingElapsed', () => {
  it('formats minutes and seconds under an hour', () => {
    expect(formatRecordingElapsed(0)).toBe('00:00');
    expect(formatRecordingElapsed(42_000)).toBe('00:42');
    expect(formatRecordingElapsed(5 * 60_000 + 3_000)).toBe('05:03');
    expect(formatRecordingElapsed(3_599_000)).toBe('59:59');
  });

  it('includes hours past one hour', () => {
    expect(formatRecordingElapsed(3600_000 + 2 * 60_000 + 3_000)).toBe(
      '1:02:03',
    );
  });

  it('clamps negative values to zero', () => {
    expect(formatRecordingElapsed(-5_000)).toBe('00:00');
  });
});
