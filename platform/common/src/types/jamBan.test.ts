import { describe, expect, it } from 'vitest';
import { jamDataSchema, jamEventDataSchema } from './models';
import { removeParticipantRequestSchema } from './api';

describe('jamDataSchema banned field', () => {
  const base = {
    moderators: ['mod-1'],
    videoEnabled: true,
    type: 'video-call',
  };

  it('accepts a jam config without a banned list (backwards compatible)', () => {
    expect(jamDataSchema.safeParse(base).success).toBe(true);
  });

  it('accepts an optional banned list of profile ids', () => {
    const result = jamDataSchema.safeParse({ ...base, banned: ['a', 'b'] });
    expect(result.success).toBe(true);
  });

  it('does not reject a jam on a removed-then-lifted (empty) list', () => {
    expect(jamDataSchema.safeParse({ ...base, banned: [] }).success).toBe(true);
  });
});

describe('jamEventDataSchema kicked type', () => {
  const base = {
    id: '01970000-0000-7000-8000-000000000001',
    jamId: '01970000-0000-7000-8000-000000000002',
    profileId: 'removed-1',
  };

  it('accepts a kicked attendance event', () => {
    expect(
      jamEventDataSchema.safeParse({ ...base, type: 'kicked' }).success,
    ).toBe(true);
  });

  it('still accepts the other attendance types', () => {
    for (const type of ['join', 'leave', 'start', 'close'] as const) {
      expect(jamEventDataSchema.safeParse({ ...base, type }).success).toBe(
        true,
      );
    }
  });
});

describe('removeParticipantRequestSchema', () => {
  it('requires a uuid identity', () => {
    expect(
      removeParticipantRequestSchema.safeParse({ identity: 'not-a-uuid' })
        .success,
    ).toBe(false);
    expect(
      removeParticipantRequestSchema.safeParse({
        identity: '01970000-0000-7000-8000-000000000003',
      }).success,
    ).toBe(true);
  });
});
