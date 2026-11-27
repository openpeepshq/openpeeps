/** @vitest-environment jsdom */
/**
 * Co-organizer management tab on the single web event page (issue #383,
 * review S1). The web `FullEvent` exposes a "Co-organizers" tab to anyone who
 * can manage RSVPs (primary organizer, co-organizer, or an update-capable
 * role), listing the current co-organizers with a Remove (primary organizer)
 * or Step down (the co-organizer themselves) action, plus the Add control.
 *
 * Web twin of the RN coverage
 * (platform/rn-components/src/components/post/types/event/FullEvent.test.tsx,
 * tests 18-21). The gating uses the real `canManageEventRsvps` from
 * `@openpeepshq/common/lib` (not a boolean stand-in, so the fixtures must
 * genuinely qualify the viewer as an RSVP manager); every other external
 * import is mocked so the co-organizer decision tree is what gets exercised.
 *
 * Rendering goes through `react-dom/client` in the jsdom environment: the
 * tab content is only mounted once the "Co-organizers" tab is active, so each
 * manager test clicks the tab first, then asserts the revealed rows/controls.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- shared mutable state read by the module mocks (mock* = hoisting-safe) --
let mockProfile: {
  id: string;
  displayName?: string;
  handle?: string;
} | null = { id: 'u-1', displayName: 'Att', handle: 'att' };

// --- openpeeps context + server info --------------------------------------
vi.mock('../../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      usePostContext: () => ({ data: undefined, isLoading: false }),
      useJamAttendance: () => ({ isSuccess: false, data: [] }),
      useJamState: () => ({ data: undefined }),
      usePostRecordings: () => ({ data: [] }),
      rsvpManageAction: () => () => Promise.resolve({}),
      updatePostAction: () => () => Promise.resolve({}),
    },
    client: { posts: { exportRsvps: async () => '' } },
  }),
}));

vi.mock('../../../../i18n', () => ({
  useT: () => (key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? key,
}));

vi.mock('../../../layout/IdentityContext', () => ({
  useCurrentProfile: () => mockProfile,
}));

vi.mock('../../../server-data', () => ({
  useServerInfo: () => ({
    jams: { livekit: { enabled: true } },
  }),
}));

vi.mock('../../../../lib/postViewCounter', () => ({
  usePostViewRef: () => (el: unknown) => el,
}));

vi.mock('../../../layout/ToastProvider', () => ({
  useToast: () => ({ success: () => {}, error: () => {} }),
}));

vi.mock('../../../conversations', () => ({
  useCreateNewConversation: () => ({
    openCreateConversation: () => {},
  }),
}));

vi.mock('../../../markdown/OpenpeepsMarkdown', () => ({
  OpenpeepsMarkdown: () => null,
}));

vi.mock('../../feed/threaded/ThreadedFeed', () => ({
  ThreadedFeed: () => null,
}));
vi.mock('../../ReplyBox', () => ({ ReplyBox: () => null }));

vi.mock('../../../../hooks/events/useEventDisplayTimeZone', () => ({
  useEventDisplayTimeZone: () => undefined,
}));

// --- sibling pieces (render inert) ----------------------------------------
vi.mock('../../pieces/EventLocation', () => ({ EventLocation: () => null }));
vi.mock('../../pieces/EventMenu', () => ({ EventMenu: () => null }));
vi.mock('../../pieces/EventOccurrenceList', () => ({
  EventOccurrenceList: () => null,
}));
vi.mock('../../pieces/EventRsvpButton', () => ({
  EventRsvpButton: () => null,
}));
vi.mock('../../pieces/EventRsvpList', () => ({ EventRsvpList: () => null }));
vi.mock('../../pieces/ShareMenu', () => ({ ShareMenu: () => null }));
vi.mock('../../pieces/VideoPlayer', () => ({ VideoPlayer: () => null }));

// --- profile / ui primitives ----------------------------------------------
vi.mock('../../../profile', () => ({
  Avatar: () => null,
  ProfileFromId: () => null,
  ProfileSelector: () => null,
}));

vi.mock('../../../layout/AccessDenied', () => ({
  AccessDenied: () => null,
}));

// The co-organizer rows and the Add control use the real `Button`; render it
// as a native control that forwards `action` (function) / `href` (string) and
// children so the controls are findable and their text is assertable. The
// remove/step-down confirmation `Dialog` is out of scope for these four
// assertions, so it and its subparts render nothing — otherwise the confirm
// copy ("Step down as a co-organizer?") would always sit in the tree and
// poison the Remove-vs-Step-down assertions.
vi.mock('@openpeepshq/react-ui', async () => {
  const React = await import('react');
  const Button = (props: {
    children?: React.ReactNode;
    className?: string;
    action?: string | (() => unknown);
    variant?: string;
    compact?: boolean;
  }) => {
    if (typeof props.action === 'string')
      return React.createElement('a', { href: props.action }, props.children);
    return React.createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          const a = props.action;
          if (typeof a === 'function') void a();
        },
      },
      props.children,
    );
  };
  const Inert = () => null;
  return {
    Button,
    Dialog: Inert,
    DialogActions: Inert,
    DialogContent: Inert,
    DialogHeader: Inert,
    DialogTitle: Inert,
    LoadingSpinner: Inert,
    UpdatingDate: Inert,
  };
});

vi.mock('lucide-react', () => {
  const Inert = () => null;
  return {
    Download: Inert,
    EyeOff: Inert,
    MoreHorizontal: Inert,
    Share: Inert,
    Trash2: Inert,
  };
});

// The gating under test uses the real `canManageEventRsvps` (and the other
// pure post helpers) from common; importOriginal keeps them real so no
// boolean stand-in can mask a regression in the RSVP-management contract.
vi.mock('@openpeepshq/common/lib', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openpeepshq/common/lib')>();
  return actual;
});

import { FullEvent } from './FullEvent';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const BASE_POST = {
  id: 'post-1',
  profile: { id: 'owner-1', displayName: 'Owner', handle: 'owner' },
  visibility: 'public',
  data: {
    type: 'event',
    name: 'Meetup',
    // `image` set so the header uses a remote URI instead of a local asset.
    image: 'https://openpeeps.org/img/pic.svg',
  },
};

// A manager who is neither the owner nor the listed co-organizer: a jam
// moderator. `canManageEventRsvps` returns true via `canModerateJam`, so this
// is the "rsvp manager" of the RN twin — the co-organizer tab is visible.
const managerPost = {
  ...BASE_POST,
  coOrganizers: [{ id: 'co-1', displayName: 'Co One', handle: 'coone' }],
  data: {
    ...BASE_POST.data,
    coOrganizers: ['co-1'],
    jam: { moderators: ['u-1'] },
  },
};

// A plain attendee: not owner, not co-organizer, no moderator role.
const attendeePost = {
  ...BASE_POST,
  coOrganizers: [{ id: 'co-1', displayName: 'Co One', handle: 'coone' }],
  data: { ...BASE_POST.data, coOrganizers: ['co-1'] },
};

// The primary organizer views a co-organizer that is not themselves.
const ownerPost = {
  ...BASE_POST,
  coOrganizers: [{ id: 'co-1', displayName: 'Co One', handle: 'coone' }],
  data: { ...BASE_POST.data, coOrganizers: ['co-1'] },
};

// The co-organizer 'u-1' views their own row (owner is someone else).
const selfCoOrganizerPost = {
  ...BASE_POST,
  coOrganizers: [{ id: 'u-1', displayName: 'Me', handle: 'me' }],
  data: { ...BASE_POST.data, coOrganizers: ['u-1'] },
};

let container: HTMLDivElement;
let root: Root;

function render(post: unknown) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<FullEvent post={post as never} />);
  });
  return container;
}

function findControl(el: HTMLElement, text: string) {
  return [
    ...el.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button, a'),
  ].find((node) => node.textContent?.trim() === text);
}

/** Click the "Co-organizers" tab so its (lazy) content mounts. */
function openCoOrganizerTab(el: HTMLElement) {
  const tab = findControl(el, 'Co-organizers');
  expect(tab, 'Co-organizers tab button should be present').toBeTruthy();
  act(() => {
    (tab as HTMLElement).click();
  });
}

beforeEach(() => {
  mockProfile = { id: 'u-1', displayName: 'Att', handle: 'att' };
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('co-organizer tab (web twin of RN tests 18-21, issue #383)', () => {
  it('rsvp manager -> co-organizer tab lists the co-organizers with an add control', () => {
    // 'u-1' is a jam moderator: canManageEventRsvps is true, but 'u-1' is
    // neither the owner nor the listed co-organizer.
    mockProfile = { id: 'u-1', displayName: 'Att', handle: 'att' };
    const el = render(managerPost);
    openCoOrganizerTab(el);
    expect(findControl(el, 'Add co-organizer')).toBeTruthy();
    expect(el.textContent).toContain('Co One');
  });

  it('non-manager (plain attendee) -> no co-organizer tab', () => {
    mockProfile = { id: 'u-2', displayName: 'Plain', handle: 'plain' };
    const el = render(attendeePost);
    expect(findControl(el, 'Co-organizers')).toBeUndefined();
    expect(el.textContent).not.toContain('Co-organizers');
    expect(el.textContent).not.toContain('Co One');
  });

  it('primary organizer -> co-organizers get a Remove action, not Step down', () => {
    // currentProfile owns the event, so the listed co-organizer is someone
    // else: Remove, not Step down.
    mockProfile = { id: 'owner-1', displayName: 'Me', handle: 'me' };
    const el = render(ownerPost);
    openCoOrganizerTab(el);
    expect(findControl(el, 'Remove')).toBeTruthy();
    expect(findControl(el, 'Step down')).toBeUndefined();
  });

  it('co-organizer viewing their own row -> Step down, not Remove', () => {
    // 'u-1' is listed as a co-organizer (and is not the post owner).
    mockProfile = { id: 'u-1', displayName: 'Me', handle: 'me' };
    const el = render(selfCoOrganizerPost);
    openCoOrganizerTab(el);
    expect(findControl(el, 'Step down')).toBeTruthy();
    expect(findControl(el, 'Remove')).toBeUndefined();
  });
});
