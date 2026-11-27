import { describe, expect, it } from 'vitest';
import { rowToDocument } from './registry';

describe('rowToDocument for jamEvents', () => {
  it('does not emit a recurrenceId when the column is null (one-off jam)', () => {
    const doc = rowToDocument('jamEvents', {
      id: '11111111-1111-4111-8111-111111111111',
      postId: '22222222-2222-4222-8222-222222222222',
      recurrenceId: null,
      body: { type: 'message', profileId: 'profile-1', content: 'hi' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(doc).not.toHaveProperty('recurrenceId');
  });

  it('lets a stale body recurrenceId stand for a one-off jam', () => {
    const doc = rowToDocument('jamEvents', {
      id: '11111111-1111-4111-8111-111111111111',
      postId: '22222222-2222-4222-8222-222222222222',
      recurrenceId: null,
      body: {
        type: 'start',
        profileId: 'profile-1',
        recurrenceId: '2026-02-01T18:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(doc.recurrenceId).toBe('2026-02-01T18:00:00.000Z');
  });

  it('overrides a stale body recurrenceId with the column value', () => {
    // The column value (2026-03-01) is deliberately different from the body
    // value (2026-02-01) — that mismatch is intentional: it is the whole point
    // of this case, exercising the column-overrides-body rule so a stale body
    // from a pre-migration write cannot shadow the denormalized recurrence_id.
    // Do not "fix" the two to match; the fixture would stop testing the rule.
    const doc = rowToDocument('jamEvents', {
      id: '11111111-1111-4111-8111-111111111111',
      postId: '22222222-2222-4222-8222-222222222222',
      recurrenceId: '2026-03-01T18:00:00.000Z',
      body: {
        type: 'start',
        profileId: 'profile-1',
        recurrenceId: '2026-02-01T18:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(doc.recurrenceId).toBe('2026-03-01T18:00:00.000Z');
  });
});
