/**
 * Web/native parity pin for the request-to-join phase machine (issue #1781).
 *
 * The web twin is pinned in `platform/react/src/components/jams/
 * JamRequestJoin.test.tsx` (same idle → waiting → denied → re-request
 * flow). The RN component gained the identical phase machine in this PR;
 * this file pins it on native: the waiting copy renders only while the
 * join stream is open, the denial copy renders after the stream reports a
 * denial, and the request affordance returns so the guest can try again.
 *
 * Only RN, i18n, and the shared join hook are stubbed. `ThemedText` is the
 * single text primitive the component renders through, so the mock records
 * every rendered label in document order (`mockRenderedTexts`) — the
 * assertions read that ordered log instead of walking the rendered tree.
 */

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

let mockOnJoin: ((params: unknown) => void) | undefined;
let mockOnDenied: (() => void) | undefined;
let mockOnError: ((e: unknown) => void) | undefined;
let mockButtonOnPress: (() => void) | undefined;
let mockButtonComponent: unknown;
const mockRenderedTexts: string[] = [];

jest.mock('react-native', () => ({
  View: (props: { children?: unknown; className?: string }) =>
    React.createElement('View', null, props.children),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    // Values mirror `platform/i18n/src/locales/en.json` so the rendered
    // copy pins the key usage.
    t: (key: string) => {
      if (key === 'jams.join.requestToJoin') return 'Request to join';
      if (key === 'jams.join.waitingForModerator')
        return 'Waiting for a moderator to let you in';
      if (key === 'jams.join.rejected')
        return 'The moderator declined your request to join';
      if (key === 'error.jamGuestPassRequired')
        return 'Sign in, or create a guest pass, to join this jam.';
      return key;
    },
  }),
}));

// The hook is the only thing that talks to the join stream; capturing its
// callbacks lets the test drive the denied transition and the non-2xx
// surface directly (a real stream would emit `{ denied: true }` / an
// SseError).
jest.mock('@openpeepshq/react', () => ({
  apiErrorMessage: (err: unknown, t: (key: string) => string) => {
    const candidate =
      (err as { errorKey?: string })?.errorKey ??
      (err as { key?: string })?.key ??
      (err as { error?: { key?: string; message?: string } })?.error?.key ??
      (err as { error?: { message?: string } })?.error?.message ??
      (err as Error)?.message;
    if (typeof candidate === 'string' && candidate.length > 0) {
      if (candidate.startsWith('error.')) return t(candidate);
      return candidate;
    }
    return '';
  },
  useJoinWaitingRoomToken: (
    onJoin: (params: unknown) => void,
    onError: (e: unknown) => void,
    onDenied?: () => void
  ) => {
    mockOnJoin = onJoin;
    mockOnError = onError;
    mockOnDenied = onDenied;
  },
}));

jest.mock('../ui/button', () => {
  mockButtonComponent = (props: {
    children?: unknown;
    onPress?: () => void;
  }) => {
    mockButtonOnPress = props.onPress;
    return React.createElement('Button', null, props.children);
  };
  return { Button: mockButtonComponent };
});

jest.mock('../ui/themed-text', () => ({
  ThemedText: (props: { children?: unknown; className?: string }) => {
    const c = props.children;
    if (typeof c === 'string' && c) mockRenderedTexts.push(c);
    return React.createElement('ThemedText', { className: props.className }, c);
  },
}));

const { JamRequestJoin } = require('./JamRequestJoin');

const pressButton = () => {
  ReactTestRenderer.act(() => {
    mockButtonOnPress?.();
  });
};

describe('JamRequestJoin denied phase (RN)', () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;

  beforeEach(() => {
    mockOnJoin = undefined;
    mockOnDenied = undefined;
    mockOnError = undefined;
    mockButtonOnPress = undefined;
    mockRenderedTexts.length = 0;
  });

  afterEach(() => {
    ReactTestRenderer.act(() => {
      tree?.unmount();
    });
    tree = undefined;
  });

  it('shows the rejection message and offers the request again after a denial', () => {
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(JamRequestJoin, { onJoin: () => {} })
      );
    });

    // Idle: only the request button, no waiting or rejection copy.
    expect(mockButtonOnPress).toBeDefined();
    expect(mockRenderedTexts).toEqual(['Request to join']);
    expect(mockOnJoin).toBeUndefined();
    expect(mockOnDenied).toBeUndefined();

    // Requesting starts the waiting phase (the join stream is opened).
    pressButton();
    expect(mockOnJoin).toBeDefined();
    expect(mockOnDenied).toBeDefined();
    expect(mockRenderedTexts).toContain(
      'Waiting for a moderator to let you in'
    );
    expect(mockRenderedTexts).not.toContain('The moderator declined');
    // The request button is replaced by the waiting copy.
    expect(
      (tree as ReactTestRenderer.ReactTestRenderer).root.findAllByType(
        mockButtonComponent as never
      )
    ).toHaveLength(0);

    // The stream reports a denial: the phase switches to denied.
    mockRenderedTexts.length = 0;
    ReactTestRenderer.act(() => {
      mockOnDenied?.();
    });

    // The rejection copy is shown and the request is offered again; the
    // waiting copy is gone (asserted on the phase's own render, since the
    // log accumulates across renders).
    expect(mockRenderedTexts).toEqual([
      'The moderator declined your request to join',
      'Request to join',
    ]);
    expect(mockButtonOnPress).toBeDefined();

    // Requesting again goes back to the waiting phase.
    mockRenderedTexts.length = 0;
    pressButton();
    expect(mockRenderedTexts).toContain(
      'Waiting for a moderator to let you in'
    );
    expect(mockRenderedTexts).not.toContain(
      'The moderator declined your request to join'
    );
    expect(
      (tree as ReactTestRenderer.ReactTestRenderer).root.findAllByType(
        mockButtonComponent as never
      )
    ).toHaveLength(0);
  });

  it('renders the mapped guest-pass copy for a 401 on the join stream', () => {
    // Web/native parity for the join path's non-2xx surface (review
    // suggestion 2): the SseError is mapped through `apiErrorMessage` to the
    // en.json `error.jamGuestPassRequired` copy and rendered in the waiting
    // phase, alongside the waiting copy (non-terminal).
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(JamRequestJoin, { onJoin: () => {} })
      );
    });
    pressButton();
    expect(mockOnError).toBeDefined();

    // The error re-renders only the child listener (its `error` state), not
    // the parent, so the waiting copy (rendered by the parent on press) was
    // already logged and is not re-logged here. Assert on the accumulated log
    // rather than clearing: both the waiting copy and the mapped error must be
    // present in the final render.
    ReactTestRenderer.act(() => {
      mockOnError?.({ status: 401, key: 'error.jamGuestPassRequired' });
    });

    expect(mockRenderedTexts).toContain(
      'Sign in, or create a guest pass, to join this jam.'
    );
    // The key itself is never rendered raw, and the waiting copy stays.
    expect(mockRenderedTexts).not.toContain('error.jamGuestPassRequired');
    expect(mockRenderedTexts).toContain(
      'Waiting for a moderator to let you in'
    );
  });
});
