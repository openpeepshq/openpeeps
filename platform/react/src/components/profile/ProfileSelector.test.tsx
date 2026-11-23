/** @vitest-environment jsdom */
/**
 * Regression pin for the member-picker row alignment (issue #1666).
 *
 * QA keeps rejecting the picker on New Group Creation, New Conversation and
 * New Post Visibility with "profile images are not aligned with display
 * name". The row was a 40px avatar + a *two-line* caption (display name,
 * then @handle) centered with `items-center` — which centers the avatar
 * against the full two-line block, leaving the avatar's center ~8px below
 * the display-name line (measured on test34 via CDP in the round-15
 * review). The picker row is now single-line (name + handle in one
 * truncated line), so `items-center` aligns the avatar with the name line
 * by construction and long names can no longer shift it.
 *
 * The tests assert the *shape* of the rendered caption, not the class
 * string: exactly one line-bearing span inside the row button, carrying the
 * display name and the handle together. A regression back to a stacked
 * two-line caption fails here.
 */
import { act, createElement, type ElementType, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { PublicProfile } from '@openpeepshq/common/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useProfiles: () => ({
        isSuccess: true,
        data: [
          {
            id: 'p1',
            handle: 'ada',
            displayName: 'Ada Lovelace',
            avatar: null,
          },
          {
            id: 'p2',
            handle: 'grace',
            displayName: 'Grace Hopper',
            avatar: null,
          },
        ],
      }),
    },
  }),
}));

vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('@openpeepshq/react-ui', () => {
  const passthrough = (name: string) => (props: { children?: ReactNode }) =>
    createElement(name as ElementType, null, props.children);
  return {
    Dialog: passthrough('dialog'),
    DialogActions: passthrough('div'),
    DialogContent: passthrough('div'),
    DialogHeader: passthrough('header'),
    DialogTitle: passthrough('h2'),
    Input: () => null,
  };
});

vi.mock('./Avatar', () => ({
  Avatar: ({ profile }: { profile: { handle: string } }) =>
    createElement('img', {
      'data-testid': 'row-avatar',
      alt: `avatar ${profile.handle}`,
      className: 'row-avatar',
    }),
}));

vi.mock('./ProfileBadge', () => ({
  ProfileBadge: ({
    profile,
  }: {
    profile: { handle: string };
    onRemove?: () => void;
  }) => createElement('span', { 'data-testid': `badge-${profile.handle}` }),
}));

import { ProfileSelector } from './ProfileSelector';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Minimal profile for the picker; only id/handle/displayName are read. */
const makeProfile = (
  id: string,
  handle: string,
  displayName: string,
): PublicProfile =>
  ({
    id,
    handle,
    displayName,
    avatar: null,
  }) as PublicProfile;

describe('ProfileSelector picker rows (issue #1666)', () => {
  let root: Root;
  let container: HTMLDivElement;

  const openSelector = (props: Record<string, unknown> = {}) => {
    act(() => {
      root.render(
        createElement(ProfileSelector, {
          open: true,
          onOpenChange: () => {},
          mode: 'multiple',
          selectedProfiles: [],
          onConfirm: () => {},
          ...props,
        }),
      );
    });
  };

  const expectSingleLineRow = (
    row: HTMLElement | undefined,
    expected: string,
  ) => {
    expect(row, 'a picker row was rendered').toBeTruthy();
    if (!row) return;
    expect(
      row.querySelector('[data-testid="row-avatar"]'),
      'row should contain the avatar',
    ).toBeTruthy();
    // The caption is the only text-bearing child: one span with the display
    // name and the handle together. A stacked name/handle caption (two
    // spans) fails here.
    const textSpans = Array.from(row.querySelectorAll('span'));
    expect(textSpans.length, 'expected exactly one caption span').toBe(1);
    const [caption] = textSpans;
    expect(caption?.textContent).toBe(expected);
    expect(caption?.className).toContain('truncate');
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const rowButtons = () =>
    Array.from(container.querySelectorAll<HTMLButtonElement>('button'));

  it('renders one line of text per row, carrying the display name and the handle', () => {
    openSelector();
    const rows = rowButtons();
    expect(rows.length).toBe(2);
    const [adaRow, graceRow] = rows;
    expectSingleLineRow(adaRow, 'Ada Lovelace @ada');
    expectSingleLineRow(graceRow, 'Grace Hopper @grace');
  });

  it('keeps long names on one truncated line (no shift from wrapping)', () => {
    openSelector({
      allowlist: [
        makeProfile(
          'p3',
          'verylongname',
          'A Very Long Display Name That Should Truncate',
        ),
      ],
    });
    const rows = rowButtons();
    expect(rows.length).toBe(1);
    const [row] = rows;
    expectSingleLineRow(
      row,
      'A Very Long Display Name That Should Truncate @verylongname',
    );
  });
});
