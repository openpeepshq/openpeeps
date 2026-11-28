import { SseError } from '@openpeepshq/fetch-client';
import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
import { apiErrorCandidate, apiErrorMessage } from '../apiErrorMessage';

const DICT: Record<string, string> = {
  'error.pollClosed': 'This poll has ended.',
  'groups.leave.lastOwnerError':
    'You are the last owner. Assign another owner before leaving.',
  'auth.login.invalidCredentials':
    "This email/password combination doesn't match a valid account.",
  'auth.register.missingCapabilities':
    "You don't have permission to create an account on this server.",
  'error.emailAlreadyTaken': 'That email is already in use.',
  'common.errors.unauthorized': 'Please log in to continue',
  'common.errors.forbidden': "You don't have permission to perform this action",
  'common.errors.notFound': 'Not found',
  'common.errors.serverError': 'Server error. Please try again later.',
  'common.errors.networkError': 'Network error. Please check your connection.',
  'common.errors.error': 'Error',
  // One key per `apiErrorCandidate` source position, so the precedence
  // test below can tell which position won.
  'chain.positionErrorKey': 'errorKey position won',
  'chain.positionKey': 'key position won',
  'chain.positionErrorKeyNested': 'error.key position won',
  'chain.positionErrorErrorKey': 'error.errorKey position won',
  'chain.positionErrorMessage': 'error.message position won',
  'chain.positionMessage': 'message position won',
};

const i18n = i18next.createInstance();
i18n.init({
  resources: { en: { translation: DICT } },
  lng: 'en',
  fallbackLng: 'en',
  initImmediate: false,
});
const t = i18n.getFixedT('en');

describe('apiErrorCandidate', () => {
  it('extracts from the known error shapes', () => {
    expect(apiErrorCandidate({ message: 'boom' })).toBe('boom');
    expect(apiErrorCandidate({ key: 'some.key' })).toBe('some.key');
    expect(apiErrorCandidate({ errorKey: 'error.pollClosed' })).toBe(
      'error.pollClosed',
    );
    expect(apiErrorCandidate({ error: { key: 'some.key' } })).toBe('some.key');
    expect(apiErrorCandidate({ error: { errorKey: 'some.key' } })).toBe(
      'some.key',
    );
    expect(apiErrorCandidate({ error: { message: 'boom' } })).toBe('boom');
    expect(apiErrorCandidate(new Error('boom'))).toBe('boom');
    expect(apiErrorCandidate('boom')).toBe('boom');
    expect(apiErrorCandidate(null)).toBe('');
    expect(apiErrorCandidate({})).toBe('');
  });

  it('returns empty for non-string values in candidate positions', () => {
    // The guards are `typeof candidate === 'string'`. A truthy non-string
    // candidate (even with a string `message` further down the chain, since
    // `??` stops at the first defined position) must not leak into the
    // mapper as a raw message — it resolves to `''`.
    expect(apiErrorCandidate({ errorKey: 123 })).toBe('');
    expect(apiErrorCandidate({ key: 123, message: 'boom' })).toBe('');
    expect(apiErrorCandidate({ message: 42 })).toBe('');
    expect(apiErrorCandidate({ error: null })).toBe('');
    expect(apiErrorCandidate({ error: { message: 42 } })).toBe('');
    expect(apiErrorCandidate(undefined)).toBe('');
    expect(apiErrorCandidate(42)).toBe('');
  });
});

describe('apiErrorMessage', () => {
  it('resolves the candidate through the documented precedence chain', () => {
    // Each assertion drops the higher-priority positions so the one under
    // test is the first present in `apiErrorCandidate`'s `??` chain. A
    // reordering changes which key wins and breaks an assertion. The
    // expected value is the *translated copy* (not the key), so it proves
    // which position actually reached the mapper.
    const P = {
      errorKey: 'chain.positionErrorKey',
      key: 'chain.positionKey',
      error: {
        key: 'chain.positionErrorKeyNested',
        errorKey: 'chain.positionErrorErrorKey',
        message: 'chain.positionErrorMessage',
      },
      message: 'chain.positionMessage',
    };
    // errorKey (highest) beats everything below it.
    expect(apiErrorMessage(P, t)).toBe('errorKey position won');
    // key beats the nested error.* and the top-level message.
    expect(apiErrorMessage({ ...P, errorKey: undefined }, t)).toBe(
      'key position won',
    );
    // error.key beats error.errorKey / error.message / message.
    expect(
      apiErrorMessage({ ...P, errorKey: undefined, key: undefined }, t),
    ).toBe('error.key position won');
    expect(
      apiErrorMessage(
        {
          ...P,
          errorKey: undefined,
          key: undefined,
          error: { ...P.error, key: undefined },
        },
        t,
      ),
    ).toBe('error.errorKey position won');
    expect(
      apiErrorMessage(
        {
          ...P,
          errorKey: undefined,
          key: undefined,
          error: { ...P.error, key: undefined, errorKey: undefined },
        },
        t,
      ),
    ).toBe('error.message position won');
    // Only the top-level message is present.
    expect(
      apiErrorMessage(
        {
          errorKey: undefined,
          key: undefined,
          error: {
            ...P.error,
            key: undefined,
            errorKey: undefined,
            message: undefined,
          },
          message: 'chain.positionMessage',
        },
        t,
      ),
    ).toBe('message position won');
  });

  it('takes the top-level status over a nested error.status', () => {
    // `errorStatus` reads `record.status ?? record.error?.status`; the wire
    // body carries the authoritative code on the outside. A 404 on the
    // outside with a 500 nested must render the 404 copy, not the 500 copy.
    expect(apiErrorMessage({ status: 404, error: { status: 500 } }, t)).toBe(
      'Not found',
    );
    // No top-level status falls through to the nested one (sub-500 nested
    // statuses render the status copy; a nested 5xx *with* a message
    // passes through raw, like its top-level counterpart).
    expect(
      apiErrorMessage({ error: { status: 403, message: 'nope' } }, t),
    ).toBe("You don't have permission to perform this action");
  });

  it('pins the register 409 email-already-taken copy for the wire shape', () => {
    // `registerHandler` throws `conflict('error.emailAlreadyTaken')`; Riddl
    // serializes it to `{ status: 409, message: 'error.emailAlreadyTaken' }`.
    // The key must translate (it exists in the locale files), so the
    // register toast shows the localized "already in use" copy, not the
    // raw key or the generic 409 handling.
    expect(
      apiErrorMessage({ status: 409, message: 'error.emailAlreadyTaken' }, t),
    ).toBe('That email is already in use.');
  });

  it('pins the register 403 missing-capabilities copy for the wire shape', () => {
    // `registerHandler` throws
    // `forbidden('auth.register.missingCapabilities')`; Riddl serializes it
    // to `{ status: 403, message: 'auth.register.missingCapabilities' }`.
    // The key must translate (it exists in the locale files), so the
    // register toast shows the localized copy instead of the generic 403
    // "permission" message (review round 4, suggestion 3).
    expect(
      apiErrorMessage(
        { status: 403, message: 'auth.register.missingCapabilities' },
        t,
      ),
    ).toBe("You don't have permission to create an account on this server.");
  });

  it('translates server messages that are i18n keys, in any namespace', () => {
    expect(
      apiErrorMessage({ status: 409, message: 'error.pollClosed' }, t),
    ).toBe('This poll has ended.');
    expect(
      apiErrorMessage(
        { status: 409, message: 'groups.leave.lastOwnerError' },
        t,
      ),
    ).toBe('You are the last owner. Assign another owner before leaving.');
  });

  it('passes through human-readable server messages', () => {
    expect(
      apiErrorMessage({ status: 422, message: 'Something specific' }, t),
    ).toBe('Something specific');
  });

  it('maps default HTTP messages to localized copy by status', () => {
    expect(
      apiErrorMessage({ status: 401, message: 'Authentication needed' }, t),
    ).toBe('Please log in to continue');
    expect(apiErrorMessage({ status: 403, message: 'Forbidden' }, t)).toBe(
      "You don't have permission to perform this action",
    );
    expect(apiErrorMessage({ status: 404, message: 'Not found' }, t)).toBe(
      'Not found',
    );
  });

  it('prefers the status copy over untranslated raw messages (sub-500 only)', () => {
    expect(apiErrorMessage({ status: 404, message: 'Post not found' }, t)).toBe(
      'Not found',
    );
  });

  it('passes message-bearing 5xx through raw (main waiting-room behavior)', () => {
    // 5xx with a human-readable message is shown as-is: the message is
    // already user copy (proxy/gateway text, SSE stream failures), and
    // main's jam waiting-room tests pin this passthrough (useJamPeople /
    // useJamFooterControls, via SSE #2311). A 5xx *without* a message still
    // maps to the generic server copy (below).
    expect(
      apiErrorMessage({ status: 500, message: 'Internal server error' }, t),
    ).toBe('Internal server error');
    expect(
      apiErrorMessage(
        { status: 500, message: 'Missing capabilities: core-posts-react' },
        t,
      ),
    ).toBe('Missing capabilities: core-posts-react');
    expect(apiErrorMessage({ status: 503, message: 'bad gateway' }, t)).toBe(
      'bad gateway',
    );
  });

  it('pins message-bearing 5xx passthrough for both resolver shapes', () => {
    // Regression pin for the seam that drifted in rounds 6/7: the deciding
    // case is an *unknown* message candidate carrying an HTTP status.
    // Exercised through both resolver shapes main actually produces:
    // a pass-through `t` (like `waitingRoomTMock`, which returns unknown
    // keys raw) and the full-dict `t` above. Reordering the
    // network/translate/status/return resolution so a 5xx re-enters the
    // status copy must fail here and in the jam waiting-room suites.
    // The case is fed as a fetch-client `SseError`, the shape the SSE
    // streams actually hand the mapper.
    const sseError: SseError = { status: 503, message: 'bad gateway' };
    const passthroughT = ((key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key) as typeof t;
    for (const resolveT of [t, passthroughT]) {
      expect(apiErrorMessage(sseError, resolveT)).toBe('bad gateway');
      expect(apiErrorMessage({ status: 500, message: 'boom' }, resolveT)).toBe(
        'boom',
      );
    }
  });

  it('uses a known wire key over the status copy', () => {
    expect(
      apiErrorMessage(
        { status: 404, message: 'Not found', key: 'error.pollClosed' },
        t,
      ),
    ).toBe('This poll has ended.');
  });

  it('passes through raw messages without a status', () => {
    expect(apiErrorMessage({ message: 'Custom server text' }, t)).toBe(
      'Custom server text',
    );
  });

  it('maps status codes without any message', () => {
    expect(apiErrorMessage({ status: 500 }, t)).toBe(
      'Server error. Please try again later.',
    );
    expect(apiErrorMessage({ status: 401 }, t)).toBe(
      'Please log in to continue',
    );
  });

  it('detects transport-level network failures', () => {
    expect(apiErrorMessage(new TypeError('Failed to fetch'), t)).toBe(
      'Network error. Please check your connection.',
    );
    expect(apiErrorMessage(new Error('NetworkRequestFailed'), t)).toBe(
      'Network error. Please check your connection.',
    );
    // React Native surfaces transport failures under its own wording.
    expect(apiErrorMessage(new Error('Network request failed'), t)).toBe(
      'Network error. Please check your connection.',
    );
    expect(
      apiErrorMessage(
        new Error('The Internet connection appears to be offline'),
        t,
      ),
    ).toBe('Network error. Please check your connection.');
  });

  it('falls back to the provided or default copy', () => {
    expect(apiErrorMessage({ status: 409 }, t, 'Failed to create group')).toBe(
      'Failed to create group',
    );
    expect(apiErrorMessage(new Error(''), t)).toBe('Error');
    expect(apiErrorMessage(undefined, t)).toBe('Error');
  });

  it('lets a caller fallback beat the generic status copy when the error has no message', () => {
    // The logout push-cleanup toast passes contextual copy; a bare 500
    // must not override it with the generic server error.
    // `__HTTP_ERROR__` is a caller convention, not a mapper feature: it is
    // set by the server on the thrown error (`platform/server/src/lib/
    // errors.ts`) and is present here only to pin the real wire shape. The
    // mapper does not read it — the assertion that matters is that an
    // *empty* candidate with a provided `fallback` beats the status copy.
    expect(
      apiErrorMessage(
        { error: { __HTTP_ERROR__: true, status: 500 } },
        t,
        'Could not remove push notifications for this device.',
      ),
    ).toBe('Could not remove push notifications for this device.');
    // Without a caller fallback, the status copy still applies.
    expect(apiErrorMessage({ error: { status: 500 } }, t)).toBe(
      'Server error. Please try again later.',
    );
  });

  it('translates a wire key even when the status has its own generic copy', () => {
    // Login with bad credentials: 401 + key. The key is specific, so it
    // wins over the generic "please log in" 401 copy.
    expect(
      apiErrorMessage(
        {
          status: 401,
          message: 'auth.login.invalidCredentials',
          key: 'auth.login.invalidCredentials',
        },
        t,
      ),
    ).toBe("This email/password combination doesn't match a valid account.");
  });

  it('pins the login invalid-credentials copy for the 401 message shape (no key)', () => {
    // The login 401 the server throws carries the i18n key as `message`
    // (Riddl serialises the httpError message into the body's `message`; the
    // `key` field is not always present). The key must beat the generic 401
    // "please log in" copy, otherwise the anti-enumeration login error would
    // read like a session expiry instead of the specific bad-credentials copy.
    expect(
      apiErrorMessage(
        { status: 401, message: 'auth.login.invalidCredentials' },
        t,
      ),
    ).toBe("This email/password combination doesn't match a valid account.");
    expect(
      apiErrorMessage(
        { status: 401, message: 'auth.login.invalidCredentials' },
        t,
      ),
    ).not.toBe('Please log in to continue');
  });
});
