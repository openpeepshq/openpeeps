/** @vitest-environment jsdom */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  JamNetworkQuality,
  JamObserverBanner,
  JamRecordingIndicator,
  JamsBannerStack,
} from './JamRoomIndicators';
import { JamPeopleDrawer } from './JamPeopleDrawer';

// Real shipped locale, so the dismiss-copy assertion pins the value the user
// actually sees — a dropped `jams.observers.dismiss` key breaks this test.
const en = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../i18n/src/locales/en.json'),
    'utf8',
  ),
) as { jams: { observers: { dismiss: string } } };

const h = vi.hoisted(() => ({
  sessions: { value: 0 },
  quality: { value: 1 }, // livekit-client ConnectionQuality.Good
  participants: { value: [] as unknown[] },
  recording: { value: false },
}));

vi.mock('@livekit/components-react', () => ({
  useConnectionQualityIndicator: () => ({ quality: h.quality.value }),
  useLocalParticipant: () => ({ localParticipant: {} }),
  useParticipants: () => h.participants.value,
  useRoomContext: () => ({}),
}));

vi.mock('livekit-client', () => ({
  ConnectionQuality: { Good: 1, Poor: 2, Lost: 3 },
}));

vi.mock('./useJamExternalSessions', () => ({
  useJamExternalSessions: () => h.sessions.value,
}));

vi.mock('./jamRecordingState', () => ({
  useJamRecordingState: () => ({ isRecording: h.recording.value }),
  useJamRecordingElapsed: () => null,
}));

vi.mock('./useParticipantConnection', () => ({
  useConnectionLost: () => false,
}));

vi.mock('./jamEventActions', () => ({
  parseParticipantMetadata: () => ({ profile: null }),
}));

vi.mock('../../hooks/jams/useJamPeople', () => ({
  useJamPeople: () => ({
    isModerator: false,
    hasWaitingRoom: false,
    moderatorIds: [],
    raisedHands: new Set<string>(),
    query: '',
    setQuery: () => {},
    listedParticipants: h.participants.value,
    waitingProfiles: [],
    admittingId: null,
    admit: () => {},
  }),
}));

vi.mock('../../i18n', () => ({
  useT:
    () => (key: string, opts?: { defaultValue?: string; count?: number }) => {
      // Plural branches mirror `jams.observers.connected`/`count` in en.json,
      // so the rendered text pins both the key/count usage and the plural
      // choice (matches the RN stubs).
      if (key === 'jams.observers.connected') {
        const count = Number(opts?.count ?? 0);
        return count === 1
          ? '1 external observer is connected to this jam'
          : `${count} external observers are connected to this jam`;
      }
      if (key === 'jams.observers.count') {
        const count = Number(opts?.count ?? 0);
        return count === 1
          ? '1 external observer'
          : `${count} external observers`;
      }
      return opts?.defaultValue ?? key;
    },
}));

vi.mock('../profile', () => ({ Avatar: () => null }));

vi.mock('../layout/ToastProvider', () => ({
  useToast: () => ({
    toast: () => {},
    success: () => {},
    error: () => {},
    info: () => {},
    count: 0,
  }),
}));

vi.mock('@openpeepshq/react-ui', () => ({
  Input: () => null,
  Button: () => null,
}));

const render = (ui: ReactNode) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root!.render(ui);
  });
  return {
    container,
    unmount: () =>
      act(() => {
        root?.unmount();
        container.remove();
      }),
    // Commit an additional render pass (same tree, state preserved) so
    // assertions can inspect post-dismiss re-render output.
    rerender: (next: ReactNode) =>
      act(() => {
        root?.render(next);
      }),
  };
};

describe('JamsBannerStack', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one shared fixed top-center container with the banners in flow order', () => {
    const { container, unmount } = render(
      <JamsBannerStack>
        <div data-testid="banner-a">A</div>
        <div data-testid="banner-b">B</div>
      </JamsBannerStack>,
    );
    const stack = container.firstElementChild as HTMLElement;

    // The stack owns ALL positioning: fixed, top-center, column flow — so
    // stacked banners can never compute overlapping offsets.
    expect(stack.className).toContain('fixed');
    expect(stack.className).toContain('top-4');
    expect(stack.className).toContain('flex-col');
    expect(stack.className).toContain('items-center');

    const a = stack.querySelector('[data-testid="banner-a"]')!;
    const b = stack.querySelector('[data-testid="banner-b"]')!;
    // Document order decides the stacking: later children render below.
    expect(
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    unmount();
  });

  it('stacks the network banner above the observer banner without per-banner offsets', () => {
    h.quality.value = 2; // ConnectionQuality.Poor
    h.sessions.value = 2;
    const { container, unmount } = render(
      <JamsBannerStack>
        <JamNetworkQuality />
        <JamObserverBanner />
      </JamsBannerStack>,
    );
    const network = container.firstElementChild!.firstElementChild!;
    const observer = network.nextElementSibling;

    expect(network.textContent).toContain('Connection status');
    expect(observer).not.toBeNull();
    expect(observer!.textContent).toContain(
      '2 external observers are connected',
    );
    // No banner positions itself: the top offset lives on the stack alone.
    expect((network as HTMLElement).style.top).toBe('');
    expect((observer as HTMLElement).style.top).toBe('');
    unmount();
  });

  it('keeps the recording pill top-left via self-start ml-4 without self-positioning', () => {
    h.recording.value = true;
    const { container, unmount } = render(
      <JamsBannerStack>
        <JamRecordingIndicator />
      </JamsBannerStack>,
    );
    const pill = container.firstElementChild!.firstElementChild as HTMLElement;

    // The pill renders inside the shared stack (not a separate fixed layer)…
    expect(pill.textContent).toContain('Recording');
    // …and keeps its deliberate top-left placement *within* the centered
    // stack: `self-start` pulls it to the start edge, `ml-4` insets it.
    expect(pill.className).toContain('self-start');
    expect(pill.className).toContain('ml-4');
    // It must NOT bring its own fixed/top positioning — the stack owns the
    // top offset, and a stray `fixed`/`top-4` here would break the stacking.
    expect(pill.className).not.toContain('fixed');
    expect(pill.className).not.toContain('top-4');
    expect(pill.style.top).toBe('');
    unmount();
    h.recording.value = false;
  });
});

describe('JamObserverBanner (web)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    h.sessions.value = 0;
    h.quality.value = 1;
  });

  it('renders nothing when no external sessions are connected', () => {
    h.sessions.value = 0;
    const { container, unmount } = render(
      <JamsBannerStack>
        <JamObserverBanner />
      </JamsBannerStack>,
    );
    expect(container.textContent).not.toContain('external observer');
    unmount();
  });

  it('shows the count with a working dismiss control', () => {
    h.sessions.value = 1;
    const { container, unmount, rerender } = render(
      <JamsBannerStack>
        <JamObserverBanner />
      </JamsBannerStack>,
    );
    // Singular copy pins the `connected_one` branch — the stub cannot produce
    // it unless the component passes `count`, so a regression in the plural
    // selection breaks this test.
    expect(container.textContent).toContain(
      '1 external observer is connected to this jam',
    );

    const dismiss = container.querySelector(
      'button[aria-label="Dismiss"]',
    ) as HTMLButtonElement;
    expect(dismiss).not.toBeNull();
    // The dismiss control is discoverable by its user-visible copy, not just
    // its aria-label: the tooltip title renders the shipped locale value.
    expect(dismiss.title).toBe(en.jams.observers.dismiss);

    act(() => {
      dismiss.click();
    });
    // Commit a further state change (a new session connects) plus an
    // `act`-wrapped re-render so the post-dismiss DOM is re-read — the
    // RN twin re-reads the live tree after its `act` for the same reason.
    h.sessions.value = 2;
    rerender(
      <JamsBannerStack>
        <JamObserverBanner />
      </JamsBannerStack>,
    );
    // Session-scoped dismissal: the banner stays out of the way even when
    // more sessions connect (a re-surfacing regression fails both checks
    // here, since the plural copy would now contain 'external observer').
    expect(h.sessions.value).toBe(2);
    expect(container.textContent).not.toContain('external observer');

    // Dedicated auto-hide assertion: the last session disconnects while the
    // banner is dismissed (the `sessions <= 0` exit branch, distinct from
    // the `dismissed` flag the block above pins). The tree must stay empty —
    // the count going to zero must not re-surface the banner either.
    h.sessions.value = 0;
    rerender(
      <JamsBannerStack>
        <JamObserverBanner />
      </JamsBannerStack>,
    );
    expect(h.sessions.value).toBe(0);
    expect(container.textContent).not.toContain('external observer');
    unmount();
  });
});

describe('JamPeopleDrawer observers section (web)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    h.sessions.value = 0;
    h.participants.value = [];
  });

  it('hides the Observers section while the drawer still lists the other sections', () => {
    h.sessions.value = 0;
    const { container, unmount } = render(
      <JamPeopleDrawer open onClose={() => {}} />,
    );
    expect(container.textContent).toContain('In jam');
    expect(container.textContent).not.toContain('Observers');
    unmount();
  });

  it('shows the external-session count under its own Observers heading below "In jam"', () => {
    h.sessions.value = 2;
    const { container, unmount } = render(
      <JamPeopleDrawer open onClose={() => {}} />,
    );
    const headings = [...container.querySelectorAll('h4')];
    const inJam = headings.find((el) => el.textContent === 'In jam');
    const observers = headings.find((el) => el.textContent === 'Observers');

    expect(observers).toBeDefined();
    expect(container.textContent).toContain('2 external observers');
    // The Observers section sits between "In jam" and the waiting room.
    expect(
      inJam!.compareDocumentPosition(observers!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    unmount();
  });

  it('shows the singular count for one connected session', () => {
    h.sessions.value = 1;
    const { container, unmount } = render(
      <JamPeopleDrawer open onClose={() => {}} />,
    );
    // Pins the `count_one` branch, mirroring the RN singular test.
    expect(container.textContent).toContain('Observers');
    expect(container.textContent).toContain('1 external observer');
    unmount();
  });
});
