/** @vitest-environment jsdom */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JamPeopleDrawer } from './JamPeopleDrawer';

// Web render-level pin for the People-drawer "Removed" (banned) section
// (issue #303 round-13 suggestion 1). The RN twin already pins the
// bannedIds/liftingId/liftBan wiring; the web drawer had no coverage for
// the header/count, the collapsed-by-default behavior, the expand toggle,
// or the lift button, so this file pins that contract on the web side.
const en = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../i18n/src/locales/en.json'),
    'utf8',
  ),
) as Record<string, unknown>;

const lookup = (key: string): string | undefined => {
  let cur: unknown = en;
  for (const part of key.split('.')) {
    cur =
      cur && typeof cur === 'object'
        ? (cur as Record<string, unknown>)[part]
        : undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
};

const h = vi.hoisted(() => ({
  moderator: { value: false },
  bannedIds: { value: [] as string[] },
  liftingId: { value: null as string | null },
  profile: {
    value: undefined as { id: string; displayName: string } | undefined,
  },
  liftBan: { value: () => {} },
}));

vi.mock('@livekit/components-react', () => ({
  useParticipants: () => [],
  useRoomContext: () => ({}),
}));

vi.mock('livekit-client', () => ({
  ConnectionQuality: { Good: 1, Poor: 2, Lost: 3 },
}));

vi.mock('./useJamExternalSessions', () => ({
  useJamExternalSessions: () => 0,
}));

vi.mock('./useParticipantConnection', () => ({
  useConnectionLost: () => false,
}));

vi.mock('./jamEventActions', () => ({
  parseParticipantMetadata: () => ({ profile: null }),
}));

vi.mock('../../hooks/jams/useJamPeople', () => ({
  useJamPeople: () => ({
    isModerator: h.moderator.value,
    hasWaitingRoom: false,
    moderatorIds: [],
    raisedHands: new Set<string>(),
    query: '',
    setQuery: () => {},
    listedParticipants: [],
    waitingProfiles: [],
    admittingId: null,
    admit: () => {},
    bannedIds: h.bannedIds.value,
    liftingId: h.liftingId.value,
    liftBan: h.liftBan.value,
  }),
}));

// Real shipped locale, so the rendered copy pins the value the user actually
// sees — a renamed `jams.people.banned` / `jams.people.unban` key breaks here.
vi.mock('../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    lookup(key) ?? opts?.defaultValue ?? key,
}));

vi.mock('../layout/ToastProvider', () => ({
  useToast: () => ({
    toast: () => {},
    success: () => {},
    error: () => {},
    info: () => {},
    count: 0,
  }),
}));

// Controlled input: a bare element would crash on React 19's value/onChange.
vi.mock('@openpeepshq/react-ui', () => ({
  Input: (props: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <input
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
    />
  ),
  // The real react-ui Button wires its `action` to onClick and self-disables
  // while a `disabled` action is in flight — the mock mirrors both so the
  // lift wiring (onLift → liftBan) and the liftingId disable are exercised.
  Button: (props: {
    children?: ReactNode;
    disabled?: boolean;
    title?: string;
    action?: () => void;
  }) => (
    <button
      type="button"
      disabled={props.disabled}
      title={props.title}
      onClick={() => {
        if (!props.disabled) props.action?.();
      }}
    >
      {props.children}
    </button>
  ),
}));

vi.mock('../profile', () => ({
  Avatar: () => null,
}));

vi.mock('../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useProfile: (id: string) =>
        id === 'banned-1' ? { data: h.profile.value } : { data: undefined },
    },
  }),
}));

const render = (node: ReactNode) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
};

// The banned header is the only button that carries an `aria-expanded`
// (the close button uses a plain `aria-label`), so select on that.
const header = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('button[aria-expanded]');

const liftButtons = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll('button[title="Allow back in"]'),
  ) as HTMLButtonElement[];

describe('JamPeopleDrawer banned section (web)', () => {
  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    h.moderator.value = false;
    h.bannedIds.value = [];
    h.liftingId.value = null;
    h.profile.value = undefined;
    h.liftBan.value = () => {};
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('hides the "Removed" section for non-moderators even when the post carries banned ids', () => {
    h.bannedIds.value = ['banned-1'];
    const { container, unmount } = render(
      <JamPeopleDrawer open onClose={() => {}} />,
    );
    expect(header(container)).toBeNull();
    expect(container.textContent).not.toContain('REMOVED');
    unmount();
  });

  it('renders the "Removed" header with its count, collapsed by default', () => {
    h.moderator.value = true;
    h.bannedIds.value = ['banned-1'];
    const { container, unmount } = render(
      <JamPeopleDrawer open onClose={() => {}} />,
    );
    const h1 = header(container);
    expect(h1).not.toBeNull();
    expect(h1!.ariaLabel).toBe('REMOVED (1)');
    expect(h1!.ariaExpanded).toBe('false');
    // Collapsed: no lift button and no resolved profile name.
    expect(liftButtons(container)).toHaveLength(0);
    expect(container.textContent).not.toContain('Banned One');
    unmount();
  });

  it('expands on click and pins the lift wiring end to end', () => {
    h.moderator.value = true;
    h.bannedIds.value = ['banned-1'];
    h.profile.value = { id: 'banned-1', displayName: 'Banned One' };
    const liftSpy = vi.fn();
    // The useJamPeople mock captures `liftBan` at mount, so the spy must be
    // installed before the first render for the row's onLift to call it.
    h.liftBan.value = liftSpy;
    const { container, unmount } = render(
      <JamPeopleDrawer open onClose={() => {}} />,
    );
    const h1 = header(container)!;

    act(() => {
      h1.click();
    });
    expect(h1.ariaExpanded).toBe('true');

    // Profile id resolved to the display name via the openpeepsApi profile
    // hook — the row only mounts while the section is expanded.
    expect(container.textContent).toContain('Banned One');

    const [lift] = liftButtons(container);
    expect(lift).toBeDefined();
    act(() => {
      lift!.click();
    });
    expect(liftSpy).toHaveBeenCalledWith('banned-1');
    unmount();
  });

  it('shows the full profile id for an unresolved row (round-15 suggestion 2)', () => {
    // Round-15 suggestion 2: the unresolved-profile fallback used to be a raw
    // id slice, diverging from the sibling "In jam" row (full
    // `participant.identity`). A removed-then-deleted profile commonly hits
    // this fallback, so it must show the full id, not a truncated slice.
    // The second banned id is longer than 8 chars so the old slice(0, 8)
    // output ("banned-2x") is distinguishable from the full id.
    h.moderator.value = true;
    h.bannedIds.value = ['banned-1', 'banned-2x-0000-0000-0000-000000000000'];
    h.profile.value = { id: 'banned-1', displayName: 'Banned One' };
    const { container, unmount } = render(
      <JamPeopleDrawer open onClose={() => {}} />,
    );
    act(() => {
      header(container)!.click();
    });
    const text = container.textContent ?? '';
    // Resolved row still shows the display name, not the raw id…
    expect(text).toContain('Banned One');
    expect(text).not.toContain('banned-1');
    // …and the unresolved row falls back to the FULL id (a truncated slice,
    // e.g. "banned-2x…", would be the wrong output here).
    expect(text).toContain('banned-2x-0000-0000-0000-000000000000');
    unmount();
  });

  it('disables the lift button while liftingId matches that row', () => {
    h.moderator.value = true;
    h.bannedIds.value = ['banned-1', 'banned-2'];
    h.liftingId.value = 'banned-1';
    const { container, unmount } = render(
      <JamPeopleDrawer open onClose={() => {}} />,
    );
    act(() => {
      header(container)!.click();
    });
    const lifts = liftButtons(container);
    expect(lifts).toHaveLength(2);
    const disabled = lifts.filter((b) => b.disabled);
    expect(disabled).toHaveLength(1);
    expect(lifts.filter((b) => !b.disabled)).toHaveLength(1);
    unmount();
  });
});
