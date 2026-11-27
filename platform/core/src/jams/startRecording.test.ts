import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  let egressShouldFail: { error: Error | undefined } = { error: undefined };
  return {
    egress: egressShouldFail,
    allpeepDb: vi.fn(),
    findActiveRecording: vi.fn().mockResolvedValue(undefined),
    cancelRecordingAutoStop: vi.fn().mockResolvedValue(undefined),
    scheduleRecordingAutoStop: vi.fn().mockResolvedValue(undefined),
    updateJamRecording: vi.fn(),
    createJamEvent: vi.fn().mockResolvedValue({}),
    roomService: vi.fn().mockResolvedValue(undefined),
    connectRecording: vi.fn(),
  };
});

vi.mock('livekit-server-sdk', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  EgressClient: class {
    async startWebEgress() {
      if (h.egress.error) {
        throw h.egress.error;
      }
      return { egressId: 'egress-1' };
    }
  },
}));
vi.mock('../db', () => ({ allpeepDb: h.allpeepDb }));
vi.mock('../config', () => ({
  config: vi.fn().mockResolvedValue({
    jams: {
      livekit: {
        url: 'https://livekit.test',
        apiKey: 'key',
        apiSecret: 'secret',
      },
    },
  }),
}));
vi.mock('../server', () => ({
  serverRootUrl: vi.fn().mockResolvedValue('https://app.test'),
}));
vi.mock('../accessTokens/tokens', () => ({
  createSignedServiceToken: vi.fn().mockResolvedValue({ signedToken: 'svc' }),
}));
vi.mock('./finders', () => ({
  findActiveRecording: h.findActiveRecording,
}));
vi.mock('./mutations', () => ({
  createJamEvent: h.createJamEvent,
  updateJamRecording: h.updateJamRecording,
}));
vi.mock('./jobs', () => ({
  cancelRecordingAutoStop: h.cancelRecordingAutoStop,
  scheduleRecordingAutoStop: h.scheduleRecordingAutoStop,
}));
vi.mock('./recording', () => ({
  finalizeJamRecording: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./recordingUploadAuth', () => ({
  jamRecordingUploadSecret: vi.fn().mockResolvedValue('upload-secret'),
}));
vi.mock('./rtmp', () => ({
  rtmpStreamOutput: vi.fn(),
  rtmpWebEgressOptions: {},
}));
vi.mock('./helpers', () => ({
  connectRecording: h.connectRecording,
}));

import { startRecording } from './livekit';
import type { JamRecording } from '@openpeepshq/common/types';

const profile = { id: '01970000-0000-7000-8000-000000000001' } as never;
const jamPost = { id: '01970000-0000-7000-8000-000000000002' } as never;
const ACTIVE_ID = '01970000-0000-7000-8000-000000000003';

let active: JamRecording;

describe('startRecording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.egress.error = undefined;
    h.allpeepDb.mockResolvedValue({ db: {} });
    h.connectRecording.mockResolvedValue({
      id: ACTIVE_ID,
      status: 'requested',
    });
    active = {
      id: ACTIVE_ID,
      status: 'active',
      egressId: 'egress-1',
      createdAt: '2026-11-27T12:00:00.000Z',
      updatedAt: '2026-11-27T12:00:00.000Z',
    } as JamRecording;
    h.updateJamRecording.mockResolvedValue(active);
  });

  it('returns the active recording when the max-duration auto-stop cannot be scheduled', async () => {
    h.scheduleRecordingAutoStop.mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 127.0.0.1:6379'),
    );

    const result = await startRecording(profile, jamPost);

    expect(result).toBe(active);
    expect(h.updateJamRecording).toHaveBeenCalledWith(
      ACTIVE_ID,
      expect.objectContaining({ egressId: 'egress-1', status: 'active' }),
    );
  });

  it('still starts the take when the recordStart notification steps fail', async () => {
    h.createJamEvent.mockRejectedValueOnce(new Error('db unavailable'));

    const result = await startRecording(profile, jamPost);

    // The take is live even though the participant notification never went out.
    expect(result).toBe(active);
    expect(h.updateJamRecording).toHaveBeenCalledWith(
      ACTIVE_ID,
      expect.objectContaining({ status: 'active' }),
    );
  });

  it('throws when egress never starts, so a genuine failure still 500s', async () => {
    h.egress.error = new Error('LiveKit egress down');

    await expect(startRecording(profile, jamPost)).rejects.toThrow(
      'LiveKit egress down',
    );
    // Nothing after egress start may run — the take never went live.
    expect(h.updateJamRecording).not.toHaveBeenCalled();
    expect(h.scheduleRecordingAutoStop).not.toHaveBeenCalled();
  });
});
