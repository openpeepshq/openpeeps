/**
 * EventRsvpButton "ended" label suppression (issue #2201).
 *
 * Pins the rsvpClosed branch: when the event's schedule says it ended, the
 * "This event has ended." label renders unless the event's jam is currently
 * in session (jamActive), while the RSVP status text above it is preserved
 * in both cases. The policy lives in the shared useEventRsvp hook
 * (platform/react); it is mocked so the component-level gating is the unit
 * under test. Mirrors the web test of the same name: the mock pins the
 * policy outputs (`showEndedLabel`, `hideRsvpButton` — the latter
 * schedule/viewed-only, never jam-driven) and the ended-label suppression
 * is derived from `jamActive`, so a jam-active mock can never leak a dead
 * RSVP block.
 */
import ReactTestRenderer from 'react-test-renderer';
import type { PublicPost } from '@openpeepshq/common/types';

// Pinned policy outputs, read at render time by the mocked hook.
const mockHook = {
  showEndedLabel: true,
  hideRsvpButton: false,
  myRsvp: undefined as
    | { response: 'yes' | 'tentative' | 'no' | 'waitlist' }
    | undefined,
};

jest.mock('@openpeepshq/react', () => ({
  useEventRsvp: (args: { jamActive?: boolean }) => ({
    profile: { id: 'viewer-1' },
    myEvent: false,
    myRsvp: mockHook.myRsvp,
    canRsvp: true,
    rsvpClosed: true,
    // A live jam suppresses the ended label but must not unhide the RSVP
    // block (same policy shape as the web test's mocked hook).
    showEndedLabel: mockHook.showEndedLabel && args.jamActive !== true,
    hideRsvpButton: mockHook.hideRsvpButton,
    recurring: false,
    defaultId: undefined,
    occurrences: [],
    capacityEvent: false,
    full: false,
    onWaitlist: false,
    offerExpiresAt: undefined,
    error: null,
    pending: null,
    setPending: jest.fn(),
    confirmingWaitlist: false,
    setConfirmingWaitlist: jest.fn(),
    submitting: false,
    requestRespond: jest.fn(),
    requestJoinWaitlist: jest.fn(),
    confirmJoinWaitlist: jest.fn(),
    claimSpot: jest.fn(),
    confirmScope: jest.fn(),
  }),
}));

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  useRef: () => ({ current: null }),
  useEffect: () => {},
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: 'BottomSheetModal',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

jest.mock('../../ui/button', () => ({
  Button: (props: { children?: unknown }) => props.children,
}));

jest.mock('../../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown }) => props.children,
}));

jest.mock('../../../lib/bottom-sheet-ref', () => ({
  bottomSheetPresent: jest.fn(),
}));

jest.mock('./EventRsvpScopeDialog', () => ({
  EventRsvpScopeDialog: () => null,
}));

jest.mock('./EventWaitlistJoinDialog', () => ({
  EventWaitlistJoinDialog: () => null,
}));

import { EventRsvpButton } from './EventRsvpButton';

type TreeNode = {
  type?: string;
  props?: Record<string, unknown> | null;
  children?: (TreeNode | string | null)[];
};

function collectText(node: unknown, out: string[] = []): string[] {
  if (node === null || typeof node !== 'object') return out;
  const nodes = Array.isArray(node) ? node : [node];
  for (const entry of nodes) {
    if (typeof entry === 'string') {
      out.push(entry);
      continue;
    }
    if (!entry) continue;
    const n = entry as TreeNode;
    for (const c of n.children || []) {
      if (typeof c === 'string') out.push(c);
      else if (c) collectText(c, out);
    }
  }
  return out;
}

const post = { id: 'post-1' } as unknown as PublicPost;

const render = (jamActive?: boolean) => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <EventRsvpButton post={post} jamActive={jamActive} />
    );
  });
  return tree;
};

const ENDED = 'events.rsvp.ended';
const ATTENDING = 'posts.rsvp.attendingMessage';

beforeEach(() => {
  mockHook.showEndedLabel = true;
  mockHook.hideRsvpButton = false;
  mockHook.myRsvp = undefined;
});

test('ended schedule, no live jam: the ended label renders', () => {
  const tree = render(false);
  expect(collectText(tree.toJSON())).toContain(ENDED);
  tree.unmount();
});

test('ended schedule, live jam active: the ended label is hidden', () => {
  const tree = render(true);
  expect(collectText(tree.toJSON())).not.toContain(ENDED);
  tree.unmount();
});

test('ended schedule, live jam active: the attending status text stays', () => {
  mockHook.myRsvp = { response: 'yes' };
  const tree = render(true);
  const text = collectText(tree.toJSON());
  expect(text).toContain(ATTENDING);
  expect(text).not.toContain(ENDED);
  tree.unmount();
});

test('ended schedule, no live jam: the attending status text and ended label render', () => {
  mockHook.myRsvp = { response: 'yes' };
  const tree = render(false);
  const text = collectText(tree.toJSON());
  expect(text).toContain(ATTENDING);
  expect(text).toContain(ENDED);
  tree.unmount();
});
