import { describe, expect, it } from 'vitest';
import type { NavTarget } from '../navigation/targets';
import { webNavHrefOf } from './webNavHrefOf';
// Import the real web navigator by relative source path (not the private
// `@openpeepshq/web` package) so this guard runs in the `@openpeepshq/react`
// unit suite — the only CI-enforced runner. Its `@openpeepshq/react` import is
// resolved to react source via the exact-match alias in vitest.config.ts.
import { createWebNavigator } from '../../../web/src/navigation/webNavigator';

/**
 * Drift guard for `webNavHrefOf` (the test-only mirror of the web navigator's
 * target→path mapping). The mirror exists because the component tests wire it
 * through their `useHrefOf` mock and assert concrete hrefs; its docblock
 * promises it stays in sync with
 * `platform/web/src/navigation/webNavigator.ts`, but until this nothing
 * enforced that — so the mirror was just the centralized version of the
 * hand-rolled stub problem it replaced.
 *
 * For every target the mirror's switch handles, its href must equal the real
 * navigator's href. If either side changes a mapping and the other does not,
 * the case below fails instead of the component tests silently asserting a
 * wrong href. The list deliberately covers each `case` in the mirror's switch
 * (feed/settings/docs/auth variants included), not the navigator's full target
 * set — the mirror only has to be right for the targets it claims to cover (it
 * throws on anything else, by design).
 */
const MIRROR_COVERED_TARGETS: NavTarget[] = [
  { type: 'welcome' },
  { type: 'about' },
  { type: 'codeOfConduct' },
  { type: 'members' },
  { type: 'feed', feed: 'local' },
  { type: 'feed', feed: 'my' },
  { type: 'feed', feed: 'bookmarks' },
  { type: 'settings' },
  { type: 'settings', section: 'public-profile' },
  { type: 'docs' },
  { type: 'docs', path: 'privacy' },
  { type: 'path', path: '/some/where' },
  { type: 'auth', mode: 'login' },
  { type: 'auth', mode: 'register' },
  { type: 'auth', mode: 'closed' },
  { type: 'auth', mode: 'validate-email' },
  { type: 'auth', mode: 'reset-password' },
  { type: 'auth', mode: 'request-reset-password' },
  // The auth redirect branch is the one place the two implementations share
  // `encodeNavRedirect`, so pin it explicitly.
  { type: 'auth', mode: 'login', redirect: { type: 'feed', feed: 'local' } },
  { type: 'auth', mode: 'register', redirect: { type: 'welcome' } },
];

describe('webNavHrefOf mirrors createWebNavigator().hrefOf', () => {
  const real = createWebNavigator().hrefOf;

  it.each(MIRROR_COVERED_TARGETS.map((t) => JSON.stringify(t)))(
    'matches the real navigator for %s',
    (serialized) => {
      const target = JSON.parse(serialized) as NavTarget;
      expect(webNavHrefOf(target), `mirror: ${serialized}`).toBe(real(target));
    },
  );
});
