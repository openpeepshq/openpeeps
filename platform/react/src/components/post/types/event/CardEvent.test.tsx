/**
 * Live Jams card row: the participant avatar stack must not overlap the
 * attendee count label (issue #2284).
 *
 * Web twin of the RN regression test
 * (platform/rn-components/src/components/post/types/event/CardEvent.test.tsx).
 * The pre-fix web markup boxed the stack in a fixed `w-12` (48px) span while
 * two 32px avatars at `-mr-2` paint 56px wide. The fix boxes the stack in a
 * fixed `w-14` (56px) — the exact painted extent of the 2-avatar max —
 * with `shrink-0`, so the label always starts after the last painted avatar
 * plus the row gap, and the count label itself is shrink-protected. These
 * assertions pin that shape: exactly one span is the fixed stack box, the
 * real `ParticipantsCard` markup sits inside it, no bare `w-12` box remains,
 * and the count label still renders beside it with `shrink-0` — for 1 and 2
 * participants.
 *
 * CardEvent is a composite, so every external import is mocked and the real
 * `ParticipantsCard` is exercised (via `vi.requireActual`) so the
 * stack-root assertion tests shipped markup, not a stand-in. Rendering goes
 * through `react-dom/server` (`renderToStaticMarkup`) in the existing node
 * vitest environment — no DOM is needed for markup assertions.
 */
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ReactNode } from 'react';
import { ParticipantsCard } from '../../pieces/ParticipantsCard';

// --- shared mutable state read by the module mocks (mock* = hoisting-safe) --
let mockJamState: { active: boolean; participants: string[] } | undefined;

// --- openpeeps context + server info --------------------------------------
vi.mock('../../../../contexts/openpeeps', () => ({
  useOpenpeeps: () => ({
    openpeepsApi: {
      useJamState: () => ({ data: mockJamState, isLoading: false }),
      useProfile: (id: string) => ({ data: { id } }),
    },
  }),
}));

vi.mock('../../../../i18n', () => ({
  useT: () => (_key: string, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}));

vi.mock('../../../layout/IdentityContext', () => ({
  useCurrentProfile: () => ({ id: 'u-1', displayName: 'Att', handle: 'att' }),
}));

vi.mock('../../../server-data', () => ({
  useServerInfo: () => ({
    jams: { livekit: { enabled: true } },
  }),
}));

vi.mock('../../../../lib/postViewCounter', () => ({
  usePostViewRef: () => (el: unknown) => el,
}));

// --- shared (pure) helpers -------------------------------------------------
vi.mock('@openpeepshq/common/lib', () => ({
  getJamUrl: () => 'https://openpeeps.org/jam/1',
  truncateText: (s: string, n: number) => (s ? s.slice(0, n) : ''),
  formatEventRecurrence: () => '',
}));

// --- ui primitives (render inert, keep className for assertions) -----------
vi.mock('@openpeepshq/react-ui', () => ({
  Button: (props: {
    children?: ReactNode;
    className?: string;
    action?: string;
  }) =>
    createElement(
      'a',
      { className: props.className, href: props.action },
      props.children,
    ),
}));

// --- sibling components (render inert) -------------------------------------
vi.mock('../../pieces/EventLocation', () => ({
  EventLocation: () => null,
}));
vi.mock('../../pieces/ShareMenu', () => ({ ShareMenu: () => null }));
vi.mock('./ProfileEventRelationship', () => ({
  ProfileEventRelationship: () => null,
}));
// The real ParticipantsCard renders `Avatar` per participant; give each
// participant a marker span so the count is assertable. (Specified relative
// to this test file so the mock resolves to the same module ParticipantsCard
// imports from `pieces/`.)
vi.mock('../../../profile', () => ({
  Avatar: (props: { profile?: { id?: string } }) =>
    createElement('span', {
      className: 'participant',
      'data-id': props.profile?.id,
    }),
}));
// CardEvent imports ParticipantsCard from the post barrel; serve the real
// component (so its markup is what gets asserted) and nothing else from it.
vi.mock('../../index', () => ({
  ParticipantsCard,
}));

import { CardEvent } from './CardEvent';

const BASE_POST = {
  id: 'post-1',
  occurrenceRecurrenceId: 'occ-1',
  data: {
    type: 'event',
    name: 'Meetup',
    jam: true,
    // `image` set so the header uses a remote URI instead of a local asset.
    image: 'https://openpeeps.org/img/pic.svg',
  },
};

/** Group-1 class list of every `<span class="...">` in `html`. */
function spanClasses(html: string): string[] {
  return [...html.matchAll(/<span class="([^"]*)">/g)].map(
    (m) => m[1] as string,
  );
}

/**
 * Visible text of `html`: HTML comments dropped (React's static-markup text
 * separator comments are markup, not text), whitespace collapsed.
 */
function textOf(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function render(participants: string[]): string {
  mockJamState = { active: true, participants };
  return renderToStaticMarkup(
    createElement(CardEvent, { post: BASE_POST as never }),
  );
}

describe('CardEvent live-jam row (issue #2284)', () => {
  it('2 participants: fixed w-14 stack box, real stack markup inside, shrink-protected count label', () => {
    const html = render(['p-1', 'p-2']);

    // (a) exactly one span is the fixed 56px stack box (the painted extent
    // of two 32px avatars at -mr-2)
    const boxes = spanClasses(html).filter((c) => c === 'w-14 shrink-0');
    expect(boxes).toHaveLength(1);

    // (b) the real ParticipantsCard stack root sits inside it and holds both
    // participants (its inner wrapper is the shipped markup, not a stand-in).
    // The label span follows the box span, so slicing up to it captures the
    // box span and nothing past it.
    const boxStart = html.indexOf('<span class="w-14 shrink-0">');
    const labelStart = html.indexOf('<span class="shrink-0">');
    const boxHtml = html.slice(boxStart, labelStart);
    expect(
      /<div class="flex w-full items-center justify-between gap-4">/.test(
        boxHtml,
      ),
    ).toBe(true);
    const participantIds = [...boxHtml.matchAll(/data-id="([^"]*)"/g)].map(
      (m) => m[1],
    );
    expect(participantIds).toEqual(['p-1', 'p-2']);

    // (c) the overlap-prone fixed box is gone: no span whose class list is
    // exactly the old fixed box (`w-12` alone).
    const bareBoxes = spanClasses(html).filter((c) => c === 'w-12');
    expect(bareBoxes).toHaveLength(0);

    // (d) the count label still renders beside the stack and is
    // shrink-protected; its text is extracted as visible text (comments
    // dropped) so the assertion is independent of React's static-markup text
    // separator comments.
    const labelMatch = html.match(/<span class="shrink-0">([\s\S]*?)<\/span>/);
    expect(labelMatch).not.toBeNull();
    expect(textOf(labelMatch![1] as string)).toBe('2 attendees');
  });

  it('1 participant: same single w-14 box and shrink-protected singular label', () => {
    const html = render(['p-1']);

    const boxes = spanClasses(html).filter((c) => c === 'w-14 shrink-0');
    expect(boxes).toHaveLength(1);

    const bareBoxes = spanClasses(html).filter((c) => c === 'w-12');
    expect(bareBoxes).toHaveLength(0);

    const labelMatch = html.match(/<span class="shrink-0">([\s\S]*?)<\/span>/);
    expect(labelMatch).not.toBeNull();
    expect(textOf(labelMatch![1] as string)).toBe('1 attendee');
  });
});
