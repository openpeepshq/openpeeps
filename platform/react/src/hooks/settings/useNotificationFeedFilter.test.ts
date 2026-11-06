/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  NotificationType,
  ProfileSettings,
  ProfileSettingsData,
} from '@openpeepshq/common/types';
import { useNotificationFeedFilter } from './useNotificationFeedFilter';

const SETTINGS_KEY = ['profiles', 'current', 'settings'];

const state = {
  settings: undefined as ProfileSettings | undefined,
  cache: undefined as ProfileSettings | undefined,
  types: [{ type: 'post' }, { type: 'dm' }] as NotificationType[],
  updateCalls: [] as ProfileSettingsData[],
  failNext: false,
};

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useCurrentProfileSettings: () => ({
        data: state.settings,
        queryKey: SETTINGS_KEY,
      }),
      useCurrentProfileNotificationTypes: () => ({ data: state.types }),
      updateCurrentProfileSettingsAction:
        () => async (input: ProfileSettingsData) => {
          state.updateCalls.push(input);
          if (state.failNext) {
            state.failNext = false;
            throw new Error('boom');
          }
          // A fresh object, like the refetch after invalidation would return.
          state.settings = {
            ...state.settings,
            ...input,
          } as ProfileSettings;
          return state.settings;
        },
    },
    queryClient: {
      getQueryData: () => state.cache,
      setQueryData: (_key: string[], value: ProfileSettings) => {
        state.cache = value;
      },
    },
    client: {
      profiles: {
        current: {
          readSettings: { queryKey: () => SETTINGS_KEY },
        },
      },
    },
  }),
}));

let filter: ReturnType<typeof useNotificationFeedFilter> | undefined;

const Probe = () => {
  filter = useNotificationFeedFilter();
  return null;
};

describe('useNotificationFeedFilter', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  const render = () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(createElement(Probe));
    });
  };

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    state.settings = {
      id: 'p1',
      hiddenNotificationTypes: [],
    } as ProfileSettings;
    state.cache = undefined;
    state.updateCalls = [];
    state.failNext = false;
    filter = undefined;
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('exposes hidden types, filter state and the feed query param', () => {
    state.settings = {
      id: 'p1',
      hiddenNotificationTypes: ['dm', 'post'],
    } as ProfileSettings;
    render();

    expect(filter?.isHidden('post')).toBe(true);
    expect(filter?.isHidden('jam')).toBe(false);
    expect(filter?.hasFilter).toBe(true);
    // Sorted for a stable query key.
    expect(filter?.excludeTypes).toBe('dm,post');
    expect(filter?.types).toEqual(state.types);
  });

  it('omits excludeTypes when nothing is hidden', () => {
    render();

    expect(filter?.hasFilter).toBe(false);
    expect(filter?.excludeTypes).toBeUndefined();
  });

  it('toggles a type in and persists the updated settings', async () => {
    render();

    await act(async () => {
      await filter?.toggle('post');
    });

    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0]?.hiddenNotificationTypes).toEqual(['post']);
    expect(state.cache?.hiddenNotificationTypes).toEqual(['post']);
  });

  it('toggles a type out again', async () => {
    state.settings = {
      id: 'p1',
      hiddenNotificationTypes: ['post'],
    } as ProfileSettings;
    render();

    await act(async () => {
      await filter?.toggle('post');
    });

    expect(state.updateCalls[0]?.hiddenNotificationTypes).toEqual([]);
  });

  it('keeps both toggles when two happen before the settings refetch', async () => {
    render();

    await act(async () => {
      await Promise.all([filter?.toggle('post'), filter?.toggle('dm')]);
    });

    expect(state.updateCalls).toHaveLength(2);
    // The second toggle must build on the first one's optimistic write.
    expect(state.updateCalls[1]?.hiddenNotificationTypes).toEqual([
      'post',
      'dm',
    ]);
  });

  it('clears all hidden types with showAll', async () => {
    state.settings = {
      id: 'p1',
      hiddenNotificationTypes: ['post', 'dm'],
    } as ProfileSettings;
    render();

    await act(async () => {
      await filter?.showAll();
    });

    expect(state.updateCalls[0]?.hiddenNotificationTypes).toEqual([]);
    expect(state.cache?.hiddenNotificationTypes).toEqual([]);
  });

  it('does nothing when showAll has nothing to clear', async () => {
    render();

    await act(async () => {
      await filter?.showAll();
    });

    expect(state.updateCalls).toHaveLength(0);
  });

  it('rolls the cache back when the update fails', async () => {
    render();
    state.failNext = true;

    await act(async () => {
      await expect(filter?.toggle('post')).rejects.toThrow('boom');
    });

    expect(state.updateCalls).toHaveLength(1);
    expect(state.cache?.hiddenNotificationTypes).toEqual([]);
  });
});
