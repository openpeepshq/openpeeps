import { describe, expect, it } from 'vitest';
import type { Event } from '../types';
import { withoutCommunityJamNotifyEveryone } from './postHelpers';

const jamEvent = (jam: Record<string, unknown>) =>
  ({ type: 'event', jam }) as unknown as Event;

describe('withoutCommunityJamNotifyEveryone', () => {
  it('drops the broadcast flag outside community-wide visibility', () => {
    for (const visibility of ['group', 'direct', undefined]) {
      const saved = withoutCommunityJamNotifyEveryone(
        jamEvent({ notifyEveryone: true, waitingRoom: true }),
        visibility,
      );
      expect(saved.jam?.notifyEveryone).toBeUndefined();
      expect(saved.jam?.waitingRoom).toBe(true);
    }
  });

  it('keeps the flag on public community-wide visibility', () => {
    const saved = withoutCommunityJamNotifyEveryone(
      jamEvent({ notifyEveryone: true }),
      'public',
    );
    expect(saved.jam?.notifyEveryone).toBe(true);
  });

  it('keeps the flag on local community-wide visibility', () => {
    const saved = withoutCommunityJamNotifyEveryone(
      jamEvent({ notifyEveryone: true }),
      'local',
    );
    expect(saved.jam?.notifyEveryone).toBe(true);
  });

  it('leaves events without the flag untouched', () => {
    const event = jamEvent({ waitingRoom: false });
    expect(withoutCommunityJamNotifyEveryone(event, 'group')).toStrictEqual(
      event,
    );
  });
});
