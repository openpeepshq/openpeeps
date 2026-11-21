/** @vitest-environment jsdom */
/**
 * Regression test for the PublicProfileSettings discoverable checkbox
 * (issue #211 round-3 review S3).
 *
 * The web settings screen seeds its `draft` state in a `useEffect` keyed on
 * `me`. If `me` (the current profile) resolves after mount — the common
 * navigation path — the discoverable checkbox must reflect `me.discoverable`,
 * not a stale default. This pins that late resolution, the toggle -> save
 * round-trip in both directions (opting back in persists `discoverable:
 * true`, opting out persists `discoverable: false`), and that the flag
 * survives the `profileDataSchema.parse` applied to the persisted
 * `PATCH /profiles/current` payload.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stable object identity is critical: useServerInfo feeds a `useMemo` whose
// dep is a nested property; a fresh object each render would recompute the
// memo every render and re-run the seeding effect (setDraft) forever.
const { meState, updateProfileMock, serverInfo, parseSpy } = vi.hoisted(() => ({
  meState: { me: undefined as Record<string, unknown> | undefined },
  updateProfileMock: vi.fn(async (_data?: Record<string, unknown>) => ({})),
  serverInfo: { communityConfig: { profiles: { additionalFields: [] } } },
  // Identity mock would hide a schema that strips the flag; a spy lets each
  // test pin what actually reaches the persisted PATCH body.
  parseSpy: vi.fn((v: unknown) => v),
}));

vi.mock('../../index', () => ({
  useT: () => (key: string) => key,
  useOpenpeeps: () => ({
    openpeepsApi: { updateCurrentProfileAction: () => updateProfileMock },
  }),
  useSetPageHeader: () => undefined,
}));

vi.mock('../../components', () => ({
  useCurrentProfile: () => meState.me,
  useServerInfo: () => serverInfo,
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
  HeaderAvatarInput: () => null,
  LocationInput: () => null,
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Button: (props: {
    children?: React.ReactNode;
    action?: () => void;
    'data-testid'?: string;
    disabled?: boolean;
  }) =>
    createElement(
      'button',
      {
        'data-testid': props['data-testid'],
        disabled: props.disabled,
        onClick: props.action,
      },
      props.children,
    ),
  Input: () => null,
  Label: () => null,
  Textarea: () => null,
}));

vi.mock('@openpeepshq/common/zod', () => ({
  ZodError: class extends Error {},
}));

vi.mock('@openpeepshq/common/types', () => ({
  profileDataSchema: { parse: parseSpy },
  accountNameSchema: { safeParse: () => ({ success: true }) },
  isForbiddenHandle: () => false,
  HANDLE_RESERVED_MESSAGE: 'reserved',
}));

vi.mock('../../lib/groupFormErrors', () => ({
  isDuplicateHandleError: () => false,
}));

import { PublicProfileSettings } from './PublicProfile';

describe('PublicProfileSettings discoverable checkbox (issue #211 S3)', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    meState.me = undefined;
    updateProfileMock.mockClear();
    parseSpy.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('reflects me.discoverable when me resolves after mount', async () => {
    // Screen mounts while the current profile is still loading.
    act(() => {
      root.render(<PublicProfileSettings />);
    });
    expect(container.querySelector('#discoverable')).toBeNull();

    // me resolves after mount with the member opted out of the directory.
    await act(async () => {
      meState.me = {
        id: 'me',
        type: 'local',
        handle: 'me',
        discoverable: false,
      };
      root.render(<PublicProfileSettings />);
    });

    const checkbox = container.querySelector(
      '#discoverable',
    ) as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    // A stale draft (seeded before me arrived) would leave it checked.
    expect(checkbox.checked).toBe(false);
  });

  it('round-trips the persisted value: toggle on then save', async () => {
    await act(async () => {
      meState.me = {
        id: 'me',
        type: 'local',
        handle: 'me',
        discoverable: false,
      };
      root.render(<PublicProfileSettings />);
    });

    // Toggle the checkbox on (re-join the directory); commit the draft update
    // before saving so submit reads the new value. A native click toggles the
    // checkbox and fires the change React wires to onChange.
    await act(async () => {
      const checkbox = container.querySelector(
        '#discoverable',
      ) as HTMLInputElement;
      checkbox.click();
    });
    expect(
      (container.querySelector('#discoverable') as HTMLInputElement)!.checked,
    ).toBe(true);

    await act(async () => {
      const button = container.querySelector(
        '[data-testid="settings-save-button"]',
      ) as HTMLButtonElement;
      button.click();
    });

    expect(updateProfileMock).toHaveBeenCalledTimes(1);
    expect(updateProfileMock.mock.calls[0]![0]).toMatchObject({
      discoverable: true,
    });
    // The persisted PATCH /profiles/current payload is what the schema parse
    // produced: pin that discoverable survives the parse, not just that the
    // component asked to set it.
    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy.mock.calls[0]![0]).toMatchObject({
      discoverable: true,
    });
  });

  it('round-trips the opt-out direction: toggle off then save', async () => {
    // A listed member (discoverable absent, the checkbox default renders
    // checked) opts out of the directory.
    await act(async () => {
      meState.me = {
        id: 'me',
        type: 'local',
        handle: 'me',
      };
      root.render(<PublicProfileSettings />);
    });

    const checkbox = container.querySelector(
      '#discoverable',
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    await act(async () => {
      checkbox.click();
    });
    expect(
      (container.querySelector('#discoverable') as HTMLInputElement)!.checked,
    ).toBe(false);

    await act(async () => {
      const button = container.querySelector(
        '[data-testid="settings-save-button"]',
      ) as HTMLButtonElement;
      button.click();
    });

    expect(updateProfileMock).toHaveBeenCalledTimes(1);
    expect(updateProfileMock.mock.calls[0]![0]).toMatchObject({
      discoverable: false,
    });
    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy.mock.calls[0]![0]).toMatchObject({
      discoverable: false,
    });
  });
});
