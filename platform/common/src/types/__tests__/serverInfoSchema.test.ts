import { describe, expect, it } from 'vitest';
import { serverInfoSchema } from '../api';

const baseInfo = {
  version: 'dev',
  environment: 'local',
  startedAt: '2026-09-04T12:00:00.000Z',
  uptimeSeconds: 12.5,
  publicContent: false,
  lastAccessed: null,
  communityConfig: {
    theme: {
      base: 'OpenpeepsLight',
      light: { primaryHex: '#15678a' },
      dark: { primaryHex: '#15678a' },
    },
    info: { name: 'Test', tagLine: 'Test community' },
    content: {},
    settings: { openRegistrations: true, defaultLanguage: 'en' },
    roles: {
      onRegistration: { add: [], remove: [] },
      onEmailValidation: { add: [], remove: [] },
    },
  },
  jams: { livekit: { url: '', enabled: false, recordingEnabled: false } },
  vapid: {},
  sentryConfig: { enabled: false },
  payments: { stripe: { paidMembership: { enabled: false } } },
};

describe('serverInfoSchema', () => {
  it('accepts instance status fields', () => {
    const parsed = serverInfoSchema.parse({
      ...baseInfo,
      build: 'abc123',
      maxProfiles: 100,
      users: {
        profileCount: 12,
        accountCount: 10,
      },
      resources: {
        processMemory: {
          rssBytes: 100,
          heapUsedBytes: 50,
          heapTotalBytes: 80,
        },
        systemMemory: { totalBytes: 1000, freeBytes: 400 },
        loadAverage: [0.1, 0.2, 0.3],
        disk: { path: '/data', totalBytes: 1000, freeBytes: 200 },
      },
    });
    expect(parsed.users.accountCount).toBe(10);
    expect(parsed.maxProfiles).toBe(100);
  });

  it('allows a self-hosted instance with no seat cap', () => {
    const parsed = serverInfoSchema.parse({
      ...baseInfo,
      build: null,
      users: {
        profileCount: 0,
        accountCount: 0,
      },
      resources: {
        processMemory: {
          rssBytes: 1,
          heapUsedBytes: 1,
          heapTotalBytes: 1,
        },
        systemMemory: { totalBytes: 1, freeBytes: 1 },
        loadAverage: [0, 0, 0],
        disk: null,
      },
    });
    expect(parsed.users.accountCount).toBe(0);
    expect(parsed.resources.disk).toBeNull();
    expect(parsed.maxProfiles).toBeUndefined();
  });
});
