import { describe, expect, it } from 'vitest';
import {
  assembleRtmpUrl,
  canAccessJamRecordings,
  canModerateJam,
  canViewJamAttendees,
  isFileJamRecording,
  pickActiveFileRecording,
  pickActiveRtmpStream,
  rtmpDestinationHost,
  toRtmpStreamResponse,
} from '../jamHelpers';
import type { JamRecording, PublicPost } from '../../types';

const jamPost = (moderators: string[]): PublicPost =>
  ({
    id: 'jam-1',
    profile: { id: 'author' },
    data: {
      type: 'event',
      jam: {
        moderators,
        videoEnabled: true,
        type: 'video-call',
      },
    },
  }) as PublicPost;

describe('assembleRtmpUrl', () => {
  it('joins rtmps URL and key without a double slash', () => {
    expect(assembleRtmpUrl('rtmps://live.streamyard.com/x/', '/abc-key')).toBe(
      'rtmps://live.streamyard.com/x/abc-key',
    );
  });

  it('accepts rtmp://', () => {
    expect(assembleRtmpUrl('rtmp://a.example/app', 'key')).toBe(
      'rtmp://a.example/app/key',
    );
  });

  it('rejects non-rtmp URLs and blanks', () => {
    expect(
      assembleRtmpUrl('https://live.streamyard.com', 'key'),
    ).toBeUndefined();
    expect(
      assembleRtmpUrl('rtmps://live.streamyard.com/x', ''),
    ).toBeUndefined();
    expect(assembleRtmpUrl('', 'key')).toBeUndefined();
  });
});

describe('rtmpDestinationHost', () => {
  it('returns the host and never the key', () => {
    expect(
      rtmpDestinationHost('rtmps://live.streamyard.com/x/secret-key'),
    ).toBe('live.streamyard.com');
  });
});

describe('recording kind isolation', () => {
  it('treats missing kind as a file recording', () => {
    expect(isFileJamRecording({})).toBe(true);
    expect(isFileJamRecording({ kind: 'file' })).toBe(true);
    expect(isFileJamRecording({ kind: 'rtmp' })).toBe(false);
  });

  it('picks file recordings without returning an active rtmp row', () => {
    const rows = [
      { id: 'rtmp-1', kind: 'rtmp' as const, status: 'active' },
      { id: 'file-1', kind: 'file' as const, status: 'active' },
    ];
    expect(pickActiveFileRecording(rows)?.id).toBe('file-1');
    expect(pickActiveRtmpStream(rows)?.id).toBe('rtmp-1');
  });

  it('picks a legacy active recording when kind is omitted', () => {
    const rows = [{ id: 'rtmp-1', kind: 'rtmp' as const }, { id: 'legacy' }];
    expect(pickActiveFileRecording(rows)?.id).toBe('legacy');
  });
});

describe('canModerateJam', () => {
  it('allows only jam moderators', () => {
    const post = jamPost(['mod-1']);
    expect(canModerateJam({ id: 'mod-1' }, post)).toBe(true);
    expect(canModerateJam({ id: 'other' }, post)).toBe(false);
    expect(canModerateJam(undefined, post)).toBe(false);
  });
});

describe('canViewJamAttendees', () => {
  it('allows the host and jam moderators', () => {
    const post = jamPost(['mod-1']);
    expect(canViewJamAttendees({ id: 'author' }, post)).toBe(true);
    expect(canViewJamAttendees({ id: 'mod-1' }, post)).toBe(true);
    expect(canViewJamAttendees({ id: 'other' }, post)).toBe(false);
    expect(canViewJamAttendees(undefined, post)).toBe(false);
  });
});

describe('canAccessJamRecordings', () => {
  it('allows the host, event moderators, and jam moderators', () => {
    const post = jamPost(['mod-1']);
    expect(canAccessJamRecordings({ id: 'author' }, post)).toBe(true);
    expect(canAccessJamRecordings({ id: 'mod-1' }, post)).toBe(true);
    expect(canAccessJamRecordings({ id: 'other' }, post)).toBe(false);
    expect(canAccessJamRecordings(undefined, post)).toBe(false);
  });

  it('allows event moderators who are not jam moderators', () => {
    const base = jamPost([]);
    const post = {
      ...base,
      data: {
        ...base.data,
        type: 'event',
        moderators: ['event-mod'],
        jam: { moderators: [], videoEnabled: true, type: 'video-call' },
      },
    } as PublicPost;
    expect(canAccessJamRecordings({ id: 'event-mod' }, post)).toBe(true);
  });
});

describe('toRtmpStreamResponse', () => {
  it('omits stream keys from the public payload', () => {
    const recording = {
      id: 'rec-1',
      status: 'active',
      kind: 'rtmp',
      destinationHost: 'live.streamyard.com',
      egressId: 'EG_1',
    } as JamRecording;
    expect(toRtmpStreamResponse(recording)).toEqual({
      id: 'rec-1',
      status: 'active',
      destinationHost: 'live.streamyard.com',
      egressId: 'EG_1',
    });
    expect(JSON.stringify(toRtmpStreamResponse(recording))).not.toMatch(
      /streamKey|secret/i,
    );
  });
});
