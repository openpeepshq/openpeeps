import { describe, expect, it } from 'vitest';
import { rowToDocument } from './registry';

describe('rowToDocument for posts', () => {
  it('exposes lastActivityAt as a scalar separate from createdAt', () => {
    const doc = rowToDocument('posts', {
      id: '11111111-1111-4111-8111-111111111111',
      type: 'note',
      visibility: 'local',
      creatorId: 'profile-1',
      body: { type: 'note', content: 'hi' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      lastActivityAt: '2026-01-03T00:00:00.000Z',
    });

    expect(doc.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(doc.lastActivityAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('falls back to createdAt when lastActivityAt is missing', () => {
    const doc = rowToDocument('posts', {
      id: '11111111-1111-4111-8111-111111111111',
      type: 'note',
      visibility: 'local',
      creatorId: 'profile-1',
      body: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(doc.lastActivityAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
