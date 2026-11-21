import { describe, expect, it } from 'vitest';
import type { Event } from '../types';
import { withoutCommunityJamNotifyEveryone } from './postHelpers';

const jamEvent = (jam: Record<string, unknown>) =>
  ({ type: 'event', jam }) as unknown as Event;

const role = (add: string[]) => ({ capabilities: { add } });
const announceRole = () => [role(['core-posts-announce'])];

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
      announceRole(),
    );
    expect(saved.jam?.notifyEveryone).toBe(true);
  });

  it('keeps the flag on local community-wide visibility', () => {
    const saved = withoutCommunityJamNotifyEveryone(
      jamEvent({ notifyEveryone: true }),
      'local',
      announceRole(),
    );
    expect(saved.jam?.notifyEveryone).toBe(true);
  });

  it('leaves events without the flag untouched', () => {
    const event = jamEvent({ waitingRoom: false });
    expect(withoutCommunityJamNotifyEveryone(event, 'group')).toStrictEqual(
      event,
    );
  });

  it('drops the flag on community-wide visibility without the announce capability', () => {
    for (const visibility of ['public', 'local']) {
      const saved = withoutCommunityJamNotifyEveryone(
        jamEvent({ notifyEveryone: true }),
        visibility,
        [role(['core-posts-create-*'])],
      );
      expect(saved.jam?.notifyEveryone).toBeUndefined();
    }
  });

  it('drops the flag on community-wide visibility with no roles', () => {
    const saved = withoutCommunityJamNotifyEveryone(
      jamEvent({ notifyEveryone: true }),
      'public',
    );
    expect(saved.jam?.notifyEveryone).toBeUndefined();
  });

  it('keeps the flag on community-wide visibility with the announce capability', () => {
    const saved = withoutCommunityJamNotifyEveryone(
      jamEvent({ notifyEveryone: true }),
      'local',
      [role(['core-posts-announce'])],
    );
    expect(saved.jam?.notifyEveryone).toBe(true);
  });

  it('keeps the flag on community-wide visibility with a wildcard role', () => {
    const saved = withoutCommunityJamNotifyEveryone(
      jamEvent({ notifyEveryone: true }),
      'public',
      [role(['core-posts-*'])],
    );
    expect(saved.jam?.notifyEveryone).toBe(true);
  });
});
