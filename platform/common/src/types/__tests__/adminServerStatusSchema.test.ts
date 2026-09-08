import { describe, expect, it } from 'vitest';
import { adminServerStatusSchema } from '../admin-server-status';

describe('adminServerStatusSchema', () => {
  it('accepts a complete status payload', () => {
    const parsed = adminServerStatusSchema.parse({
      version: 'dev',
      build: 'abc123',
      environment: 'local',
      startedAt: '2026-09-04T12:00:00.000Z',
      uptimeSeconds: 12.5,
      subscription: {
        plan: 'Community',
        maxProfiles: 100,
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
    expect(parsed.subscription.maxProfiles).toBe(100);
  });

  it('allows a self-hosted instance with no plan or seat cap', () => {
    const parsed = adminServerStatusSchema.parse({
      version: 'dev',
      build: null,
      environment: 'local',
      startedAt: '2026-09-04T12:00:00.000Z',
      uptimeSeconds: 1,
      subscription: {
        plan: null,
        maxProfiles: null,
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
    expect(parsed.subscription.plan).toBeNull();
    expect(parsed.resources.disk).toBeNull();
  });
});
