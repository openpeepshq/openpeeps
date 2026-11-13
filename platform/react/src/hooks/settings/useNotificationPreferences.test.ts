import { describe, expect, it } from 'vitest';
import type { ProfileSettings } from '@openpeepshq/common';
import {
  isNotificationsDirty,
  setNotificationSetting,
} from './useNotificationPreferences';

const asSettings = (
  notifications: ProfileSettings['notifications'],
): ProfileSettings =>
  ({ id: 'p1', notifications }) as unknown as ProfileSettings;

const reply = { create: true, push: false, email: true };
const base = asSettings({ reply });

describe('setNotificationSetting', () => {
  it('replaces only the targeted type, keeping the others', () => {
    const withMention = asSettings({
      reply,
      mention: { create: false, push: true, email: false },
    });
    const next = setNotificationSetting(withMention, 'reply', {
      ...reply,
      push: true,
    });
    expect(next.notifications?.reply).toEqual({
      create: true,
      push: true,
      email: true,
    });
    expect(next.notifications?.mention).toEqual(
      withMention.notifications?.mention,
    );
  });

  it('does not mutate the previous settings (the saved baseline must stay intact)', () => {
    const next = setNotificationSetting(base, 'reply', {
      ...reply,
      push: true,
    });
    expect(base.notifications?.reply).toEqual(reply);
    expect(base.notifications).not.toBe(next.notifications);
  });

  it('returns a new notifications object', () => {
    const next = setNotificationSetting(base, 'reply', { ...reply, push: true });
    expect(base.notifications).not.toBe(next.notifications);
  });
});

describe('isNotificationsDirty', () => {
  it('is false before any saved data exists', () => {
    expect(isNotificationsDirty(asSettings({}), undefined as unknown as ProfileSettings)).toBe(false);
  });

  it('is false while the local settings match the saved ones', () => {
    expect(isNotificationsDirty(base, base)).toBe(false);
  });

  it('is true when one toggle differs', () => {
    const edited = asSettings({ reply: { ...reply, push: true } });
    expect(isNotificationsDirty(edited, base)).toBe(true);
  });

  it('is false for key-order permutation', () => {
    const a = asSettings({ reply, mention: { create: true, push: false, email: false } });
    const b = asSettings({ mention: { create: true, push: false, email: false }, reply });
    expect(isNotificationsDirty(a, b)).toBe(false);
  });

  it('ignores unrelated non-notification fields', () => {
    const a = asSettings({ reply });
    const b = asSettings({ reply });
    expect(isNotificationsDirty(a, b)).toBe(false);
  });

  it('treats undefined vs {} entry as equal (normalized compare)', () => {
    const a = asSettings({ reply });
    const b = asSettings({ reply, mention: undefined });
    expect(isNotificationsDirty(a, b)).toBe(false);
  });

  it('is false when both sides are null', () => {
    expect(isNotificationsDirty(null, null)).toBe(false);
  });
});

describe('edits-only lifecycle', () => {
  it('edits set -> dirty; save success (baseline replaced) -> not dirty', () => {
    const saved = asSettings({ reply });
    const edited = asSettings({ reply: { ...reply, push: true } });
    expect(isNotificationsDirty(edited, saved)).toBe(true);
    expect(isNotificationsDirty(null, saved)).toBe(false);
  });

  it('refetch while edits exist -> still dirty, edits intact', () => {
    const oldBaseline = asSettings({ reply });
    const edited = asSettings({ reply: { ...reply, push: true } });
    expect(isNotificationsDirty(edited, oldBaseline)).toBe(true);
    const newerBaseline = asSettings({ reply });
    expect(isNotificationsDirty(edited, newerBaseline)).toBe(true);
  });

  it('save failure (baseline unchanged) -> still dirty', () => {
    const saved = asSettings({ reply });
    const edited = asSettings({ reply: { ...reply, push: true } });
    expect(isNotificationsDirty(edited, saved)).toBe(true);
    expect(isNotificationsDirty(edited, saved)).toBe(true);
  });

  it('saved becomes equal to edits (successful save) -> not dirty', () => {
    const edited = asSettings({ reply: { ...reply, push: true } });
    expect(isNotificationsDirty(edited, edited)).toBe(false);
  });
});
