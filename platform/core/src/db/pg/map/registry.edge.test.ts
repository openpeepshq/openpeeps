import { describe, expect, it } from 'vitest';
import { rowToDocument } from './registry';

describe('rowToDocument for edges', () => {
  it('prefers the row primary key over a stale body.id', () => {
    const doc = rowToDocument(
      'jamRecordings',
      {
        id: 'row-id',
        fromId: 'profile-1',
        toId: 'post-1',
        body: { id: 'stale-body-id', status: 'active' },
        createdAt: '2026-08-05T00:00:00.000Z',
        updatedAt: '2026-08-05T00:00:01.000Z',
      },
      true,
    );

    expect(doc.id).toBe('row-id');
    expect(doc.status).toBe('active');
    expect(doc._from).toBe('profiles/profile-1');
    expect(doc._to).toBe('posts/post-1');
  });
});
