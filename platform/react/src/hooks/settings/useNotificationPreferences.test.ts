/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileSettings } from '@openpeepshq/common';
import {
  isNotificationsDirty,
  setNotificationSetting,
  useNotificationPreferences,
} from './useNotificationPreferences';

const asSettings = (
  notifications: ProfileSettings['notifications'],
): ProfileSettings =>
  ({ id: 'p1', notifications }) as unknown as ProfileSettings;

const reply = { create: true, push: false, email: true };
const base = asSettings({ reply });

const { hookFixture } = vi.hoisted(() => ({
  hookFixture: {
    me: null as unknown,
    api: {} as Record<string, unknown>,
  },
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({ openpeepsApi: hookFixture.api }),
}));

vi.mock('../../i18n/context', () => ({
  useT: () => (key: string, opts?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'settings.notifications.updateSuccess': 'Notification settings updated.',
      'settings.notifications.pushSubscribeFailed':
        'Could not enable push notifications on this device.',
    };
    return (translations[key] ?? key).replace(
      /\{\{(\w+)\}\}/g,
      (_match: string, name: string) => opts?.[name] ?? '',
    );
  },
}));

vi.mock('../../components/layout/IdentityContext', () => ({
  useCurrentProfile: () => hookFixture.me,
}));

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
    const next = setNotificationSetting(base, 'reply', {
      ...reply,
      push: true,
    });
    expect(base.notifications).not.toBe(next.notifications);
  });
});

describe('isNotificationsDirty', () => {
  it('is false before any saved data exists', () => {
    expect(
      isNotificationsDirty(
        asSettings({}),
        undefined as unknown as ProfileSettings,
      ),
    ).toBe(false);
  });

  it('is false while the local settings match the saved ones', () => {
    expect(isNotificationsDirty(base, base)).toBe(false);
  });

  it('is true when one toggle differs', () => {
    const edited = asSettings({ reply: { ...reply, push: true } });
    expect(isNotificationsDirty(edited, base)).toBe(true);
  });

  it('is false for key-order permutation', () => {
    const a = asSettings({
      reply,
      mention: { create: true, push: false, email: false },
    });
    const b = asSettings({
      mention: { create: true, push: false, email: false },
      reply,
    });
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

describe('useNotificationPreferences.save', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  let captured: ReturnType<typeof useNotificationPreferences> | undefined;
  let updateSettings: ReturnType<typeof vi.fn>;

  const Host = () => {
    captured = useNotificationPreferences();
    return null;
  };

  const renderHook = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(Host));
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    hookFixture.me = { id: 'me' };
    updateSettings = vi.fn(async () => ({}));
    hookFixture.api = {
      useCurrentProfileNotificationTypes: () => ({ data: [] }),
      useCurrentProfileSettings: () => ({
        data: asSettings({ reply }),
        isLoading: false,
        isError: false,
        refetch: () => Promise.resolve(),
      }),
      updateCurrentProfileSettingsAction: () => updateSettings,
    };
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
    captured = undefined;
  });

  it('surfaces a rejected save as an error status (no unhandled rejection)', async () => {
    renderHook();
    act(() => {
      captured!.setTypeSettings('reply', { ...reply, push: true });
    });
    expect(captured!.dirty).toBe(true);
    updateSettings.mockRejectedValueOnce(new Error('network down'));
    await act(async () => {
      await captured!.save();
    });
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(captured!.status).toEqual({
      type: 'error',
      message: 'network down',
    });
    expect(captured!.saving).toBe(false);
    // A failed save must keep the edits so nothing is lost.
    expect(captured!.dirty).toBe(true);
  });

  it('reports a successful save and clears the edits', async () => {
    renderHook();
    act(() => {
      captured!.setTypeSettings('reply', { ...reply, push: true });
    });
    await act(async () => {
      await captured!.save();
    });
    expect(captured!.status).toEqual({
      type: 'success',
      message: 'Notification settings updated.',
    });
    expect(captured!.dirty).toBe(false);
  });

  it('a refetch while edits exist keeps the edits (no clobber)', () => {
    renderHook();
    act(() => {
      captured!.setTypeSettings('reply', { ...reply, push: true });
    });
    expect(captured!.dirty).toBe(true);
    // Swap the query cache to a fresh baseline object, as a refetch does.
    hookFixture.api.useCurrentProfileSettings = () => ({
      data: asSettings({ reply }),
      isLoading: false,
      isError: false,
      refetch: () => Promise.resolve(),
    });
    act(() => {
      root?.render(createElement(Host));
    });
    expect(captured!.dirty).toBe(true);
    expect(captured!.settings.notifications?.reply).toEqual({
      create: true,
      push: true,
      email: true,
    });
  });
});
